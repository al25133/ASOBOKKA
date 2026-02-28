/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // 👈 ここでUnsplashの画像を許可します
      },
    ],
  },
};

export default nextConfig;