const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const skillsData = [
    {
        name: "Language Development Skills",
        subSkills: [
            "Follows instructions", "Expresses ideas clearly", "Engages in friendly conversation", "Answers questions correctly",
            "Delivers a simple message", "Describes something that has been seen", "States own name clearly", "Participates actively in conversations",
            "Recites a poem or sings a children’s song", "Matches picture parts to create a simple story", "Solves simple riddles", "Shares information about family",
            "Recognizes and names environmental sounds", "Tells a story from memory", "Listens attentively", "Uses polite and kind words",
            "Says “thank you” when helped", "Apologizes when a mistake is made", "Pronounces words correctly", "Recognizes simple picture symbols",
            "Interprets pictures meaningfully", "Addresses friends by name", "Expresses ideas using clues or hints", "Sings while keeping rhythm",
            "Describes a personal experience", "Names vegetables and fruits"
        ]
    },
    {
        name: "Physical Development Skills",
        subSkills: [
            "Walks on tiptoes", "Walks along a straight line", "Walks on a raised surface", "Climbs stairs upright",
            "Jumps down from a small height", "Jumps forward twice", "Jumps on one leg", "Runs in a circle with others",
            "Runs along a straight line", "Walks in a circular path", "Walks backward without falling", "Walks with balance",
            "Balances an object on head while walking", "Buttons own clothes", "Dresses independently", "Attaches flowers to a pattern",
            "Throws a ball at a target", "Bounces a ball", "Rides a swing independently", "Kicks a ball",
            "Eats food properly", "Inflates a balloon", "Wears shoes and socks", "Carries own school bag",
            "Carries water in a container", "Hits a ball using a bat", "Cleans own lunch box", "Cleans eating area",
            "Holds crayons or brushes correctly", "Tears paper", "Blows soap bubbles"
        ]
    },
    {
        name: "Aesthetic & Creative Skills",
        subSkills: [
            "Draws what is observed", "Colors within boundaries", "Expresses ideas through drawings", "Participates in dance",
            "Maintains rhythm while singing", "Creates using clay or sand", "Cuts shapes with scissors", "Creates designs with leaves",
            "Imitates animal movements", "Acts out characters", "Plays simple instruments", "Scribbles freely",
            "Colors freely", "Draws animals", "Draws independently", "Creates foot-stamp patterns",
            "Creates traditional items", "Leaf dye artwork", "Creates cardboard vehicles", "Creates rainbows",
            "Participates in free movement", "Creates new items", "Performs hand puppets", "Colors a flower", "Presents costumes"
        ]
    },
    {
        name: "Logical & Mathematical Skills",
        subSkills: [
            "Counts from 1 to 5", "Sorts objects by height", "Sorts objects by size", "Sorts objects by length",
            "Identifies top and bottom", "Differentiates colors", "Sorts objects by material", "Differentiates sizes",
            "Differentiates shapes", "Identifies positions", "Identifies day and night", "Names colors",
            "Names shapes", "Identifies texture", "Performs one-to-one matching"
        ]
    },
    {
        name: "Living & Non-Living World",
        subSkills: [
            "Names important places", "Names animals", "Names pets", "Names trees and leaves",
            "Plants and cares for trees", "Uses water responsibly", "Names sky objects", "Observes sunrise changes",
            "Describes a moonlit night", "Names flowers", "Names community helpers", "Identifies East",
            "Observes shadows", "Observes animal behavior", "Identifies day and night animals", "Washes and dries cloth",
            "Demonstrates air movement activity", "Makes paper boats", "Performs drying leaves activity", "Observes rain",
            "Flies kites", "Imitates animals", "Identifies plants by leaves", "Creates clay art",
            "Recognizes natural sounds", "Uses natural materials", "Feeds animals", "Creates nut or seed items",
            "Identifies floating and sinking objects", "Creates a rainbow using water", "Creates a honeycomb model", "Practices proper waste disposal",
            "Maintains classroom cleanliness", "Prepares leaf porridge", "Closes water tap properly", "Helps needy individuals",
            "Performs polythene experiment", "Observes ice melting", "Identifies flower texture", "Measures rainfall", "Identifies fruit taste"
        ]
    },
    {
        name: "Healthy Living Habits",
        subSkills: [
            "Washes hands properly", "Eats neatly", "Eats without spilling", "Follows healthy eating habits",
            "Welcomes parents", "Speaks politely", "Speaks kindly", "Encourages others",
            "Helps others", "Follows group rules", "Loves animals", "Loves plants",
            "Picks items without damage", "Plays friendly games", "Displays joyful behavior", "Completes assigned tasks",
            "Follows teacher instructions", "Comes to school happily", "Waits for turn", "Practices self-care",
            "Shares with others", "Makes friends", "Plays safely", "Cleans learning materials",
            "Uses tools safely", "Follows road safety rules", "Avoids animal cruelty", "Drinks water regularly",
            "Eats fruits", "Avoids food waste", "Eats nutritious food", "Avoids soft drinks",
            "Avoids junk food", "Listens attentively", "Respects opinions", "Practices religious activities",
            "Accepts responsibility", "Handles personal belongings", "Works confidently", "Practices personal safety"
        ]
    },
    {
        name: "Cultural Heritage & Values",
        subSkills: [
            "Works cooperatively with others", "Listens patiently", "Communicates respectfully", "Respects others’ feelings",
            "Prevents conflicts", "Tells own stories", "Demonstrates self-discipline", "Respects opinions",
            "Displays religious behavior", "Respects elders", "Uses kind words", "Shows temple awareness",
            "Shares historical stories", "Shares belongings", "Waits for turn", "Participates in New Year traditions",
            "Controls emotions", "Cares for personal items", "Protects belongings", "Protects public property",
            "Displays age-appropriate behavior"
        ]
    }
];

async function main() {
    console.log('Seeding skill metadata...');
    for (const category of skillsData) {
        const createdCategory = await prisma.skill_category.upsert({
            where: { name: category.name },
            update: {},
            create: { name: category.name }
        });

        console.log(`Created Category: ${createdCategory.name}`);

        for (const subSkillName of category.subSkills) {
            await prisma.sub_skill.upsert({
                where: {
                    // Since there's no unique constraint on sub_skill name across all categories
                    // but we want to avoid duplicates under the same category, we can't use upsert easily without a composite unique key.
                    // However, for seeding, we can just findFirst and create if not exists
                    id: 0 // placeholder
                },
                update: {},
                create: {
                    name: subSkillName,
                    categoryId: createdCategory.id
                }
            }).catch(async (e) => {
                // Fallback if upsert with id 0 fails (which it will if it doesn't support it)
                const existing = await prisma.sub_skill.findFirst({
                    where: { name: subSkillName, categoryId: createdCategory.id }
                });
                if (!existing) {
                    await prisma.sub_skill.create({
                        data: { name: subSkillName, categoryId: createdCategory.id }
                    });
                }
            });
        }
    }
    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
