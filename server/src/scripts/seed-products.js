import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Product } from '../models/Product.js';
import { products } from '../../../src/data/products.js';

const forceOverwrite = process.argv.includes('--force');

function toProductDocument(product, index) {
  return {
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
  };
}

async function seedProducts() {
  if (!env.MONGODB_URI) {
    throw new Error('Configura MONGODB_URI en el archivo .env antes de cargar el catálogo.');
  }

  const documents = products.map(toProductDocument);

  // bulkWrite no ejecuta validadores de Mongoose por defecto; validamos cada documento antes de escribir.
  for (const document of documents) {
    const validationError = new Product(document).validateSync();
    if (validationError) {
      throw new Error(`Producto inválido (${document.slug}): ${validationError.message}`);
    }
  }

  await connectDatabase();

  if (forceOverwrite) {
    console.warn('Modo --force activo: se sobrescribirán precios, stock y textos de los productos existentes.');
  }

  const updateOperator = forceOverwrite ? '$set' : '$setOnInsert';
  const operations = documents.map((document) => ({
    updateOne: {
      filter: { slug: document.slug },
      update: { [updateOperator]: document },
      upsert: true,
    },
  }));

  const result = await Product.bulkWrite(operations, { ordered: true });
  const skippedCount = documents.length - result.upsertedCount - result.modifiedCount;
  console.log(
    `Catálogo procesado (${forceOverwrite ? 'sobrescritura --force' : 'modo seguro'}): `
    + `${result.upsertedCount} creados, ${result.modifiedCount} actualizados, ${skippedCount} sin cambios.`,
  );
}

seedProducts()
  .catch((error) => {
    console.error('No se pudo cargar el catálogo:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
