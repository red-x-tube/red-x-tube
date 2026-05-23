import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  
  const login = useAdminLogin({
    mutation: {
      onSuccess: () => {
        setLocation("/admin/dashboard");
      },
      onError: () => {
        toast({
          title: "Access Denied",
          description: "Invalid credentials.",
          variant: "destructive",
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ data: { password } });
  };

  return (
    <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto border border-purple-500/20 mb-6">
            <Lock className="w-8 h-8 text-purple-500" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">SYSTEM ACCESS</h1>
          <p className="text-white/40 text-sm">Enter administrator credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[#1a1a24] border-white/10 h-12 text-center text-lg tracking-widest text-white focus-visible:ring-purple-500"
          />
          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold"
            disabled={login.isPending}
          >
            {login.isPending ? "VERIFYING..." : "ENTER"}
          </Button>
        </form>
      </div>
    </div>
  );
}