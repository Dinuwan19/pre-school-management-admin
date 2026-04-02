const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SKILLS_DATA = [
    {
        name: 'Language Development Skills',
        skills: [
            'Follows instructions', 'Expresses ideas clearly', 'Engages in friendly conversation', 
            'Answers questions correctly', 'Delivers a simple message', 'Describes something seen', 
            'States own name clearly', 'Participates actively in conversations', 'Recites a poem or song',
            'Matches picture parts for a story', 'Solves simple riddles', 'Shares family info', 
            'Recognizes environmental sounds', 'Tells a story from memory', 'Listens attentively', 
            'Uses polite and kind words', 'Says thank you', 'Apologizes when mistake is made', 
            'Pronounces words correctly', 'Recognizes picture symbols', 'Interprets pictures', 
            'Addresses friends by name', 'Expresses ideas using clues', 'Sings with rhythm', 
            'Describes personal experience', 'Names vegetables and fruits'
        ]
    },
    {
        name: 'Physical Development Skills',
        skills: [
            'Walks on tiptoes', 'Walks along a straight line', 'Walks on raised surface', 
            'Climbs stairs upright', 'Jumps down from small height', 'Jumps forward twice', 
            'Jumps on one leg', 'Runs in a circle', 'Runs along a straight line', 
            'Walks in a circular path', 'Walks backward without falling', 'Walks with balance', 
            'Balances an object on head', 'Buttons own clothes', 'Dresses independently', 
            'Attaches flowers to pattern', 'Throws a ball at target', 'Bounces a ball', 
            'Rides a swing independently', 'Kicks a ball', 'Eats food properly', 
            'Inflates a balloon', 'Wears shoes and socks', 'Carries own school bag', 
            'Carries water in container', 'Hits a ball using a bat', 'Cleans own lunch box', 
            'Cleans eating area', 'Holds crayons or brushes correctly', 'Tears paper', 
            'Blows soap bubbles'
        ]
    },
    {
        name: 'Aesthetic & Creative Skills',
        skills: [
            'Draws what is observed', 'Colors within boundaries', 'Expresses ideas through drawings', 
            'Participates in dance', 'Maintains rhythm while singing', 'Creates using clay or sand', 
            'Cuts shapes with scissors', 'Creates designs with leaves', 'Imitates animal movements', 
            'Acts out characters', 'Plays simple instruments', 'Scribbles freely', 'Colors freely', 
            'Draws animals', 'Draws independently', 'Creates foot-stamp patterns', 
            'Creates traditional items', 'Leaf dye artwork', 'Creates cardboard vehicles', 
            'Creates rainbows', 'Participates in free movement', 'Creates new items', 
            'Performs hand puppets', 'Colors a flower', 'Presents costumes'
        ]
    },
    {
        name: 'Logical & Mathematical Skills',
        skills: [
            'Counts from 1 to 5', 'Sorts by height', 'Sorts by size', 'Sorts by length', 
            'Identifies top and bottom', 'Differentiates colors', 'Sorts by material', 
            'Differentiates sizes', 'Differentiates shapes', 'Identifies positions', 
            'Identifies day and night', 'Names colors', 'Names shapes', 
            'Identifies texture', 'Performs one-to-one matching'
        ]
    },
    {
        name: 'Living & Non-Living World',
        skills: [
            'Names important places', 'Names animals', 'Names pets', 'Names trees and leaves', 
            'Plants and cares for trees', 'Uses water responsibly', 'Names sky objects', 
            'Observes sunrise changes', 'Describes a moonlit night', 'Names flowers', 
            'Names community helpers', 'Identifies East', 'Observes shadows', 
            'Observes animal behavior', 'Identifies day and night animals', 'Washes and dries cloth', 
            'Air movement activity', 'Makes paper boats', 'Drying leaves activity', 
            'Observes rain', 'Flies kites', 'Imitates animals', 'Identifies plants by leaves', 
            'Creates clay art', 'Recognizes natural sounds', 'Uses natural materials', 
            'Feeds animals', 'Creates nut or seed items', 'Floating and sinking objects', 
            'Creates a rainbow using water', 'Creates a honeycomb model', 'Waste disposal', 
            'Maintains classroom cleanliness', 'Prepares leaf porridge', 'Closes water tap properly', 
            'Helps needy individuals', 'Polythene experiment', 'Observes ice melting', 
            'Identifies flower texture', 'Measures rainfall', 'Identifies fruit taste'
        ]
    },
    {
        name: 'Healthy Living Habits',
        skills: [
            'Washes hands properly', 'Eats neatly', 'Eats without spilling', 'Healthy eating habits', 
            'Welcomes parents', 'Speaks politely', 'Speaks kindly', 'Encourages others', 
            'Helps others', 'Follows group rules', 'Loves animals', 'Loves plants', 
            'Picks items without damage', 'Plays friendly games', 'Displays joyful behavior', 
            'Completes assigned tasks', 'Follows teacher instructions', 'Comes to school happily', 
            'Waits for turn', 'Practices self-care', 'Shares with others', 'Makes friends', 
            'Plays safely', 'Cleans learning materials', 'Uses tools safely', 
            'Road safety rules', 'Avoids animal cruelty', 'Drinks water regularly', 
            'Eats fruits', 'Avoids food waste', 'Eats nutritious food', 'Avoids soft drinks', 
            'Avoids junk food', 'Listens attentively', 'Respects opinions', 
            'Religious activities', 'Accepts responsibility', 'Handles personal belongings', 
            'Works confidently', 'Practices personal safety'
        ]
    },
    {
        name: 'Cultural Heritage & Values',
        skills: [
            'Works cooperatively', 'Listens patiently', 'Communicates respectfully', 
            'Respects others feelings', 'Prevents conflicts', 'Tells own stories', 
            'Demonstrates self-discipline', 'Respects opinions', 'Displays religious behavior', 
            'Respects elders', 'Uses kind words', 'Shows temple awareness', 
            'Shares historical stories', 'Shares belongings', 'Waits for turn', 
            'Participates in New Year traditions', 'Controls emotions', 'Cares for personal items', 
            'Protects belongings', 'Protects public property', 'Age-appropriate behavior'
        ]
    }
];

async function sync() {
    try {
        console.log('--- Starting Skill Synchronization ---');
        for (const cat of SKILLS_DATA) {
            // 1. Create or Find Category
            const category = await prisma.skill_category.upsert({
                where: { name: cat.name },
                update: {},
                create: { name: cat.name }
            });
            console.log(`Category: ${category.name} (ID: ${category.id})`);

            // 2. Create Skills
            for (const skillName of cat.skills) {
                const existing = await prisma.sub_skill.findFirst({
                    where: { 
                        name: skillName,
                        categoryId: category.id
                    }
                });

                if (!existing) {
                    await prisma.sub_skill.create({
                        data: {
                            name: skillName,
                            categoryId: category.id
                        }
                    });
                    console.log(`  + Created: ${skillName}`);
                } else {
                    console.log(`  . Exists: ${skillName}`);
                }
            }
        }
        console.log('--- Synchronization Complete ---');
    } catch (e) {
        console.error('Error during sync:', e);
    } finally {
        await prisma.$disconnect();
    }
}

sync();
