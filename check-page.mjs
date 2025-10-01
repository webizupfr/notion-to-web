#!/usr/bin/env node

import { kv } from '@vercel/kv';

const slug = 'doc';

console.log(`\n🔍 Checking page: ${slug}\n`);

try {
  const bundle = await kv.get(`page:${slug}`);
  
  if (!bundle) {
    console.log('❌ Page not found in cache');
    process.exit(1);
  }
  
  console.log('✅ Page found!\n');
  console.log('📊 Metadata:');
  console.log('-------------');
  console.log('Title:', bundle.meta.title);
  console.log('Slug:', bundle.meta.slug);
  console.log('Full Width:', bundle.meta.fullWidth);
  console.log('Has Child Pages:', !!bundle.meta.childPages?.length);
  console.log('Child Pages Count:', bundle.meta.childPages?.length || 0);
  console.log('');
  
  if (bundle.meta.childPages?.length) {
    console.log('📄 Child Pages:');
    console.log('-------------');
    bundle.meta.childPages.forEach((child, i) => {
      console.log(`${i + 1}. ${child.title} (${child.slug})`);
    });
  } else {
    console.log('⚠️  No child pages found');
  }
  
  console.log('\n🎯 Should show sidebar:', bundle.meta.fullWidth && !!bundle.meta.childPages?.length);
  console.log('');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

