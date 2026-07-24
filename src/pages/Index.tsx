/** Home page */
export default function IndexPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <section className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          AI SaaS Platform
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          构建于 Cloudflare 的下一代 AI 应用平台。
        </p>
        <p className="mt-2 text-sm text-gray-500">
          AI 聊天 · AI 美妆 · AI 图片 · AI 视频 · AI 陪伴 · 创作者平台 · 淘宝联盟
        </p>
      </section>
    </div>
  );
}
