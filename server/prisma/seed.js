"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.warn('Seeding database...');
    const passwordHash = await bcrypt_1.default.hash('password123', 10);
    const alice = await prisma.user.upsert({
        where: { email: 'alice@example.com' },
        update: {},
        create: {
            email: 'alice@example.com',
            username: 'alice',
            passwordHash,
            rating: 1400,
            gamesPlayed: 20,
            gamesWon: 12,
            gamesLost: 6,
            gamesDrawn: 2,
        },
    });
    const bob = await prisma.user.upsert({
        where: { email: 'bob@example.com' },
        update: {},
        create: {
            email: 'bob@example.com',
            username: 'bob',
            passwordHash,
            rating: 1250,
            gamesPlayed: 15,
            gamesWon: 7,
            gamesLost: 7,
            gamesDrawn: 1,
        },
    });
    console.warn(`Created users: alice (${alice.id}), bob (${bob.id})`);
    console.warn('Seeding complete.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => {
    void prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map