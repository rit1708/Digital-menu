# Database Seeding Script

This script populates the database with sample restaurants, categories, and dishes.

## Usage

Run the seeding script with:

```bash
npm run db:seed
```

## What it does

1. **Creates a test user** (or uses existing one with email: `admin@restaurant.com`)
2. **Cleans up existing data** for the test user (optional - you can comment this out)
3. **Creates restaurants** with sample data:
   - Agnes Restaurant (Mumbai, India)
   - Spice Garden (Delhi, India)
4. **Creates categories** for each restaurant:
   - Starters/Appetizers
   - Main Course/Curries
   - Desserts/Breads
5. **Creates dishes** with:
   - Name, description, price
   - Spice level (0-5)
   - Vegetarian/non-vegetarian flag
   - Optional images
6. **Links dishes to categories** via the many-to-many relationship

## Sample Data

The script includes:
- **2 Restaurants**
- **6 Categories** (3 per restaurant)
- **15+ Dishes** with various attributes

## Customization

Edit `scripts/seed.ts` to:
- Change the test user email
- Add more restaurants
- Modify categories and dishes
- Adjust prices, descriptions, etc.

## Notes

- The script will delete existing data for the test user before seeding
- All dishes are properly linked to their categories
- The script handles duplicate dishes (if a dish belongs to multiple categories)

