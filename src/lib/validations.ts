import { z } from "zod";

// Auth validations
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

export const verificationCodeSchema = z
  .string()
  .min(1, "Verification code is required")
  .length(6, "Verification code must be 6 digits")
  .regex(/^\d+$/, "Verification code must contain only numbers");

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be less than 100 characters")
  .trim();

export const countrySchema = z
  .string()
  .min(1, "Country is required")
  .min(2, "Country must be at least 2 characters")
  .max(100, "Country must be less than 100 characters")
  .trim();

export const sendCodeSchema = z.object({
  email: emailSchema,
});

export const verifyLoginSchema = z.object({
  email: emailSchema,
  code: verificationCodeSchema,
});

export const registerSchema = z.object({
  email: emailSchema,
  code: verificationCodeSchema,
  name: nameSchema,
  country: countrySchema,
});

// Restaurant validations
export const restaurantNameSchema = z
  .string()
  .min(1, "Restaurant name is required")
  .min(2, "Restaurant name must be at least 2 characters")
  .max(200, "Restaurant name must be less than 200 characters")
  .trim();

export const restaurantLocationSchema = z
  .string()
  .min(1, "Location is required")
  .min(2, "Location must be at least 2 characters")
  .max(200, "Location must be less than 200 characters")
  .trim();

export const createRestaurantSchema = z.object({
  name: restaurantNameSchema,
  location: restaurantLocationSchema,
});

// Category validations
export const categoryNameSchema = z
  .string()
  .min(1, "Category name is required")
  .min(2, "Category name must be at least 2 characters")
  .max(100, "Category name must be less than 100 characters")
  .trim();

export const createCategorySchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  name: categoryNameSchema,
});

// Dish validations
export const dishNameSchema = z
  .string()
  .min(1, "Dish name is required")
  .min(2, "Dish name must be at least 2 characters")
  .max(200, "Dish name must be less than 200 characters")
  .trim();

export const dishDescriptionSchema = z
  .string()
  .max(1000, "Description must be less than 1000 characters")
  .trim()
  .optional()
  .or(z.literal(""));

export const imageUrlSchema = z
  .string()
  .url("Please enter a valid URL")
  .max(500, "Image URL must be less than 500 characters")
  .optional()
  .or(z.literal(""));

export const priceSchema = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "number" && isNaN(val)) return undefined;
    return val;
  },
  z
    .number({
      invalid_type_error: "Price must be a valid number",
    })
    .min(0, "Price must be 0 or greater")
    .max(999999.99, "Price must be less than 999,999.99")
    .optional()
    .nullable()
);

export const spiceLevelSchema = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "number" && isNaN(val)) return undefined;
    return val;
  },
  z
    .number({
      invalid_type_error: "Spice level must be a valid number",
    })
    .int("Spice level must be a whole number")
    .min(0, "Spice level must be between 0 and 5")
    .max(5, "Spice level must be between 0 and 5")
    .optional()
    .nullable()
);

export const createDishSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  name: dishNameSchema,
  description: dishDescriptionSchema,
  image: imageUrlSchema,
  price: priceSchema,
  spiceLevel: spiceLevelSchema,
  isVegetarian: z.boolean().default(true),
  categoryIds: z.array(z.string()).optional().default([]),
});

// Form schema (without restaurantId for client-side forms)
export const dishFormSchema = z.object({
  name: dishNameSchema,
  description: dishDescriptionSchema,
  image: imageUrlSchema,
  price: priceSchema,
  spiceLevel: spiceLevelSchema,
  isVegetarian: z.boolean(),
  categoryIds: z.array(z.string()),
});

export const updateDishSchema = z.object({
  id: z.string().min(1, "Dish ID is required"),
  name: dishNameSchema,
  description: dishDescriptionSchema,
  image: imageUrlSchema,
  price: priceSchema,
  spiceLevel: spiceLevelSchema,
  isVegetarian: z.boolean().default(true),
  categoryIds: z.array(z.string()).default([]),
});

// Type exports
export type SendCodeInput = z.infer<typeof sendCodeSchema>;
export type VerifyLoginInput = z.infer<typeof verifyLoginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateDishInput = z.infer<typeof createDishSchema>;
export type DishFormInput = z.infer<typeof dishFormSchema>;
export type UpdateDishInput = z.infer<typeof updateDishSchema>;

