import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

interface DishData {
  name: string;
  description?: string;
  image?: string;
  price?: number;
  spiceLevel?: number;
  isVegetarian?: boolean;
  categoryNames: string[]; // Categories this dish belongs to
}

interface CategoryData {
  name: string;
  dishes: DishData[];
}

interface RestaurantData {
  name: string;
  location: string;
  categories: CategoryData[];
}

const sampleData: RestaurantData[] = [
  {
    name: "Agnes Restaurant",
    location: "Mumbai, India",
    categories: [
      {
        name: "Starters",
        dishes: [
          {
            name: "Paneer Tikka",
            description: "Grilled cottage cheese marinated in spices",
            price: 250,
            spiceLevel: 2,
            isVegetarian: true,
            image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
            categoryNames: ["Starters"],
          },
          {
            name: "Chicken Wings",
            description: "Spicy fried chicken wings",
            price: 320,
            spiceLevel: 4,
            isVegetarian: false,
            image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400",
            categoryNames: ["Starters"],
          },
          {
            name: "Spring Rolls",
            description: "Crispy vegetable spring rolls with dipping sauce",
            price: 180,
            spiceLevel: 1,
            isVegetarian: true,
            categoryNames: ["Starters"],
          },
        ],
      },
      {
        name: "Main Course",
        dishes: [
          {
            name: "Butter Chicken",
            description: "Creamy tomato-based curry with tender chicken",
            price: 450,
            spiceLevel: 2,
            isVegetarian: false,
            image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
            categoryNames: ["Main Course"],
          },
          {
            name: "Dal Makhani",
            description: "Creamy black lentils cooked overnight",
            price: 280,
            spiceLevel: 1,
            isVegetarian: true,
            image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",
            categoryNames: ["Main Course"],
          },
          {
            name: "Biryani",
            description: "Fragrant basmati rice with spiced meat",
            price: 380,
            spiceLevel: 3,
            isVegetarian: false,
            categoryNames: ["Main Course"],
          },
          {
            name: "Palak Paneer",
            description: "Spinach curry with cottage cheese",
            price: 320,
            spiceLevel: 1,
            isVegetarian: true,
            categoryNames: ["Main Course"],
          },
        ],
      },
      {
        name: "Desserts",
        dishes: [
          {
            name: "Gulab Jamun",
            description: "Sweet milk dumplings in rose syrup",
            price: 120,
            spiceLevel: 0,
            isVegetarian: true,
            image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400",
            categoryNames: ["Desserts"],
          },
          {
            name: "Ice Cream",
            description: "Vanilla, chocolate, or strawberry",
            price: 100,
            spiceLevel: 0,
            isVegetarian: true,
            categoryNames: ["Desserts"],
          },
        ],
      },
    ],
  },
  {
    name: "Spice Garden",
    location: "Delhi, India",
    categories: [
      {
        name: "Appetizers",
        dishes: [
          {
            name: "Samosa",
            description: "Crispy pastry filled with spiced potatoes",
            price: 60,
            spiceLevel: 2,
            isVegetarian: true,
            categoryNames: ["Appetizers"],
          },
          {
            name: "Chicken 65",
            description: "Spicy deep-fried chicken",
            price: 280,
            spiceLevel: 5,
            isVegetarian: false,
            categoryNames: ["Appetizers"],
          },
        ],
      },
      {
        name: "Curries",
        dishes: [
          {
            name: "Chicken Curry",
            description: "Traditional Indian chicken curry",
            price: 420,
            spiceLevel: 3,
            isVegetarian: false,
            categoryNames: ["Curries"],
          },
          {
            name: "Aloo Gobi",
            description: "Potato and cauliflower curry",
            price: 250,
            spiceLevel: 2,
            isVegetarian: true,
            categoryNames: ["Curries"],
          },
        ],
      },
      {
        name: "Breads",
        dishes: [
          {
            name: "Naan",
            description: "Soft leavened flatbread",
            price: 50,
            spiceLevel: 0,
            isVegetarian: true,
            categoryNames: ["Breads"],
          },
          {
            name: "Garlic Naan",
            description: "Naan topped with garlic and butter",
            price: 80,
            spiceLevel: 1,
            isVegetarian: true,
            categoryNames: ["Breads"],
          },
        ],
      },
    ],
  },
];

async function main() {
  console.log("🌱 Starting database seeding...\n");

  try {
    // Find or create a test user
    let user = await prisma.user.findUnique({
      where: { email: "admin@restaurant.com" },
    });

    if (!user) {
      console.log("Creating test user...");
      user = await prisma.user.create({
        data: {
          email: "admin@restaurant.com",
          name: "Admin User",
          country: "India",
        },
      });
      console.log(`✅ Created user: ${user.email}\n`);
    } else {
      console.log(`✅ Using existing user: ${user.email}\n`);
    }

    // Clear existing data for this user (optional - comment out if you want to keep existing data)
    console.log("Cleaning up existing data...");
    const existingRestaurants = await prisma.restaurant.findMany({
      where: { userId: user.id },
      include: { dishes: true, categories: true },
    });

    for (const restaurant of existingRestaurants) {
      await prisma.dishCategory.deleteMany({
        where: {
          dish: {
            restaurantId: restaurant.id,
          },
        },
      });
      await prisma.dish.deleteMany({
        where: { restaurantId: restaurant.id },
      });
      await prisma.category.deleteMany({
        where: { restaurantId: restaurant.id },
      });
      await prisma.restaurant.delete({
        where: { id: restaurant.id },
      });
    }
    console.log("✅ Cleaned up existing data\n");

    // Create restaurants, categories, and dishes
    for (const restaurantData of sampleData) {
      console.log(`Creating restaurant: ${restaurantData.name}...`);

      const restaurant = await prisma.restaurant.create({
        data: {
          name: restaurantData.name,
          location: restaurantData.location,
          userId: user.id,
        },
      });

      console.log(`  ✅ Created restaurant: ${restaurant.name}`);

      // Create categories and dishes
      for (const categoryData of restaurantData.categories) {
        const category = await prisma.category.create({
          data: {
            name: categoryData.name,
            restaurantId: restaurant.id,
          },
        });

        console.log(`    ✅ Created category: ${category.name}`);

        // Create dishes for this category
        for (const dishData of categoryData.dishes) {
          // Check if dish already exists (in case it belongs to multiple categories)
          let dish = await prisma.dish.findFirst({
            where: {
              restaurantId: restaurant.id,
              name: dishData.name,
            },
          });

          if (!dish) {
            dish = await prisma.dish.create({
              data: {
                name: dishData.name,
                description: dishData.description || null,
                image: dishData.image || null,
                price: dishData.price || null,
                spiceLevel: dishData.spiceLevel || null,
                isVegetarian: dishData.isVegetarian ?? true,
                restaurantId: restaurant.id,
              },
            });
            console.log(`      ✅ Created dish: ${dish.name}`);
          } else {
            console.log(`      ℹ️  Dish already exists: ${dish.name}`);
          }

          // Link dish to categories
          for (const categoryName of dishData.categoryNames) {
            const categoryToLink = await prisma.category.findFirst({
              where: {
                restaurantId: restaurant.id,
                name: categoryName,
              },
            });

            if (categoryToLink) {
              // Check if link already exists
              const existingLink = await prisma.dishCategory.findUnique({
                where: {
                  dishId_categoryId: {
                    dishId: dish.id,
                    categoryId: categoryToLink.id,
                  },
                },
              });

              if (!existingLink) {
                await prisma.dishCategory.create({
                  data: {
                    dishId: dish.id,
                    categoryId: categoryToLink.id,
                  },
                });
                console.log(`        🔗 Linked ${dish.name} to ${categoryName}`);
              }
            }
          }
        }
      }

      console.log(`  ✅ Completed restaurant: ${restaurant.name}\n`);
    }

    console.log("🎉 Database seeding completed successfully!\n");

    // Print summary
    const summary = await prisma.restaurant.findMany({
      where: { userId: user.id },
      include: {
        categories: {
          include: {
            dishes: {
              include: {
                dish: true,
              },
            },
          },
        },
        dishes: true,
      },
    });

    console.log("📊 Summary:");
    console.log(`   Restaurants: ${summary.length}`);
    summary.forEach((restaurant) => {
      console.log(`   - ${restaurant.name}:`);
      console.log(`     Categories: ${restaurant.categories.length}`);
      console.log(`     Dishes: ${restaurant.dishes.length}`);
    });
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

