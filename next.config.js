/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/generate-reply": ["./prompts/**/*"],
    },
  },
};
module.exports = nextConfig;
