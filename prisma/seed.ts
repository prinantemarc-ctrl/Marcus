import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@marcus.com" },
    update: {},
    create: {
      email: "admin@marcus.com",
      name: "Admin",
      passwordHash: adminPassword,
      role: "ADMIN",
      company: "Aleria",
    },
  });
  
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create a demo client user
  const clientPassword = await bcrypt.hash("client123", 12);
  
  const client = await prisma.user.upsert({
    where: { email: "demo@client.com" },
    update: {},
    create: {
      email: "demo@client.com",
      name: "Demo Client",
      passwordHash: clientPassword,
      role: "CLIENT",
      company: "Demo Company",
    },
  });
  
  console.log(`✅ Demo client created: ${client.email}`);

  // Create default LLM config
  await prisma.lLMConfig.upsert({
    where: { name: "default" },
    update: {},
    create: {
      name: "default",
      provider: "ollama",
      model: "llama3.1:8b",
      baseUrl: "http://localhost:11434",
      isActive: true,
    },
  });
  
  console.log("✅ Default LLM config created");

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📋 Login credentials:");
  console.log("   Admin: admin@marcus.com / admin123");
  console.log("   Client: demo@client.com / client123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
