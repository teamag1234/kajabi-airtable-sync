/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    KAJABI_API_KEY: process.env.KAJABI_API_KEY,
    AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
  }
}

module.exports = nextConfig
