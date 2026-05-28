import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-3xl font-bold mb-4">ページが見つかりません</h2>
        <p className="text-gray-600 mb-8">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => navigate("/login")}
            className="bg-black hover:bg-gray-800 text-white"
          >
            <Home className="h-4 w-4 mr-2" />
            ホームに戻る
          </Button>
        </div>
      </div>
    </div>
  );
}
