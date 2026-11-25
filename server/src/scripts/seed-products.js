import { connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Product } from '../models/Product.js';
import { products } from '../../../src/data/products.js';
import mongoose from 'mongoose';

async function seedProducts() {
  if (!env.MONGODB_URI) {
    throw new Error('Configura MONGODB_URI en el archivo .env antes de cargar el catálogo.');
  }

  await connectDatabase();
  const operations = products.map((product, index) => ({
    updateOne: {
      filter: { slug: product.id },
      update: {
        $set: {
          slug: product.id,
          name: product.name,
          scientificName: product.species,
          description: product.description,
          priceARS: product.price,
          category: product.category,
          categoryLabel: product.categoryLabel,
          image: product.image,
          imageAlt: product.imageAlt,
          catalogNote: product.note,
          stockStatus: 'ask',
          isActive: true,
          sortOrder: index,
        },
      },
      upsert: true,
    },
  }));

  const result = await Product.bulkWrite(operations, { ordered: true });
  console.log('Catálogo cargado:', result.upsertedCount + result.modifiedCount, 'productos procesados.');
}

seedProducts()
  .catch((error) => {
    console.error('No se pudo cargar el catálogo:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
