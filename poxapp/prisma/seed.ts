import crypto from "crypto";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

type SeedUser = {
    username: string;
    password: string;
    name: string;
    phone: string | null;
    email: string | null;
    role: UserRole;
};

const seedUsers: SeedUser[] = [
    {
        username: "profdux",
        password: "dux123",
        name: "Profdux",
        phone: null,
        email: null,
        role: UserRole.ADMIN,
    },
    {
        username: "mugedeniz90@gmail.com",
        password: "mugedeniz",
        name: "Muge Deniz",
        phone: null,
        email: "mugedeniz90@gmail.com",
        role: UserRole.USER,
    },
    {
        username: "salihmujdat.balkan@neu.edu.tr",
        password: "05338388625",
        name: "Prof. Dr. Salih Mujdat Balkan",
        phone: "05338388625",
        email: "salihmujdat.balkan@neu.edu.tr",
        role: UserRole.USER,
    },
    {
        username: "kaya.suer@neu.edu.tr",
        password: "05338843723",
        name: "Prof. Dr. Kaya Suer",
        phone: "05338843723",
        email: "kaya.suer@neu.edu.tr",
        role: UserRole.USER,
    },
    {
        username: "ceyhun.dalkan@med.neu.edu.tr",
        password: "05338422857",
        name: "Prof. Dr. Ceyhun Dalkan",
        phone: "05338422857",
        email: "ceyhun.dalkan@med.neu.edu.tr",
        role: UserRole.USER,
    },
    {
        username: "serap.maden@neu.edu.tr",
        password: "05391062693",
        name: "Uzm. Dr. Serap Maden",
        phone: "05391062693",
        email: "serap.maden@neu.edu.tr",
        role: UserRole.USER,
    },
];

function normalizeValue(value: string | null) {
    if (!value) {
        return null;
    }

    return value.trim().toLowerCase();
}

function hashPassword(password: string) {
    return crypto
        .createHash("sha256")
        .update(`password:${password}`)
        .digest("hex");
}

async function main() {
    for (const user of seedUsers) {
        const usernameNormalized = normalizeValue(user.username);
        if (!usernameNormalized) {
            continue;
        }

        const emailNormalized = normalizeValue(user.email);

        await prisma.user.upsert({
            where: { usernameNormalized },
            update: {
                username: user.username,
                email: user.email,
                emailNormalized,
                passwordHash: hashPassword(user.password),
                name: user.name,
                phone: user.phone,
                role: user.role,
                isActive: true,
            },
            create: {
                username: user.username,
                usernameNormalized,
                email: user.email,
                emailNormalized,
                passwordHash: hashPassword(user.password),
                name: user.name,
                phone: user.phone,
                role: user.role,
                isActive: true,
            },
        });
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
