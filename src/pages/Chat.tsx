import { useAuth } from "../stores/AuthProvider";
import { Navigate } from "react-router";

export default function ChatPage() {
  const auth = useAuth();

  if (!auth.state.user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-900">AI 聊天</h1>
        <p className="mt-2 text-sm text-gray-500">欢迎回来，{auth.state.user.nickname}!</p>
        <p className="mt-4 text-sm text-gray-600">Credits 余额: {auth.state.planName}</p>
      </div>
    </div>
  );
}

