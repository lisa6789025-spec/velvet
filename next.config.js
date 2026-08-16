/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/generate-reply": ["./prompts/**/*"],
      "/api/flush": ["./prompts/**/*"],
    },
  },
};
module.exports = nextConfig;
