import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";

// Prevent caching
export const dynamic = "force-dynamic";

// GET /api/admin/users
export async function GET(req) {
  try {
    console.log("🔍 Fetching users...");
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      console.log("❌ Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();
    console.log("📡 MongoDB connected");

    // Get URL parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search");

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select("name email role createdAt lastLogin")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(query);

    console.log(`✅ Found ${users.length} users`);
    return NextResponse.json({
      data: users,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return NextResponse.json(
      { error: "Error fetching users" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users
export async function POST(req) {
  try {
    console.log("📝 Creating new user...");
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      console.log("❌ Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, role } = body;

    // Basic validations
    if (!name || !email) {
      console.log("❌ Missing required fields");
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["user", "admin", "editor", "moderator"];
    if (role && !validRoles.includes(role)) {
      console.log("❌ Invalid role:", role);
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await connectMongo();
    console.log("📡 MongoDB connected");

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("❌ Email already exists:", email);
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Create user
    const user = await User.create({
      name,
      email,
      role: role || "user",
    });

    console.log("✅ User created successfully:", user._id);
    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("❌ Error creating user:", error);
    return NextResponse.json({ error: "Error creating user" }, { status: 500 });
  }
}
