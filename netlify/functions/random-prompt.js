/**
 * Random Prompt Generator
 * Returns creative "brainrot" prompts for video generation
 */

const prompts = {
    cursedMinecraft: [
        "Steve with realistic human teeth smiling at camera",
        "Creeper but it's a grandma knitting a sweater",
        "Villager with bodybuilder muscles flexing",
        "Enderman wearing a business suit at office meeting",
        "Fat Pikachu made of Minecraft blocks eating diamonds",
        "Herobrine working at McDonald's drive-through",
        "Zombie pigman as a DJ at a nightclub",
        "Skeleton riding a unicycle in the desert",
        "Alex but she's 50 feet tall destroying a village",
        "Sheep with human face staring into your soul"
    ],

    oceanHorror: [
        "Giant eye opening at the bottom of the ocean",
        "Diver discovering a massive underwater doorway",
        "Whale skeleton with glowing red eyes",
        "Submarine next to something impossibly large in the dark",
        "Deep sea fish but it has human hands",
        "Ancient temple ruins at the bottom of the Mariana Trench",
        "Megalodon shadow behind a small boat"
    ],

    monsterHybrid: [
        "Pikachu mixed with Shrek",
        "SpongeBob but realistic and terrifying",
        "Mickey Mouse as a Dark Souls boss",
        "Thomas the Tank Engine with spider legs",
        "Elmo but he's 50 feet tall in a city",
        "Dora the Explorer as a Viking warrior",
        "Peppa Pig but photorealistic"
    ],

    spaceHorror: [
        "Astronaut finding a door floating in space",
        "The sun with a human face watching Earth",
        "Planet made entirely of eyes",
        "Space station abandoned for 1000 years",
        "Black hole that looks like it's smiling"
    ]
};

const narrations = {
    cursedMinecraft: [
        "This Minecraft world looks completely normal... but look closer.",
        "Something is wrong with this village.",
        "POV: You logged into the wrong server.",
        "Day 47: The villagers are acting strange."
    ],
    oceanHorror: [
        "Scientists found this at 36,000 feet below.",
        "This is why we've only explored 5% of the ocean.",
        "The last thing the submarine camera recorded.",
        "They told us not to go deeper..."
    ],
    monsterHybrid: [
        "AI was asked to combine two characters...",
        "This shouldn't exist.",
        "My sleep paralysis demon be like:",
        "When you mix the wrong things together:"
    ],
    spaceHorror: [
        "NASA deleted this image.",
        "James Webb captured something it wasn't supposed to.",
        "This is 4 billion light years away... and it's moving closer.",
        "The universe is not empty."
    ]
};

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Parse request
        let category = null;
        if (event.body) {
            const body = JSON.parse(event.body);
            category = body.category;
        }

        // Get random category if not specified
        const categories = Object.keys(prompts);
        if (!category || !prompts[category]) {
            category = categories[Math.floor(Math.random() * categories.length)];
        }

        // Get random prompt and narration
        const promptList = prompts[category];
        const narrationList = narrations[category];

        const randomPrompt = promptList[Math.floor(Math.random() * promptList.length)];
        const randomNarration = narrationList[Math.floor(Math.random() * narrationList.length)];

        // Get random template
        const templates = ['zoomOut', 'zoomIn', 'glitch'];
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                category: category,
                prompt: randomPrompt,
                narration: randomNarration,
                template: randomTemplate,
                availableCategories: categories
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
