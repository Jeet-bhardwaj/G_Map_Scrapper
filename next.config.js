/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // For Docker and serverless deployments
  images: {
    unoptimized: false, // Enable image optimization
    domains: [],
  },
  // Increase API route body size limit for scraping
  serverRuntimeConfig: {
    maxDuration: 300, // 5 minutes
  },
  // Environment variables that should be available on both client and server
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig

