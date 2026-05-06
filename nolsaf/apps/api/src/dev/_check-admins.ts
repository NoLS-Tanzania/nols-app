import { prisma } from "@nolsaf/prisma";

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  console.log(JSON.stringify(admins, null, 2));
  await prisma.$disconnect();
}

main();
