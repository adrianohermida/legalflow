import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Check auth mode and redirect accordingly
    const authMode = localStorage.getItem("auth-mode");

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        const newValue = prev - 1;
        if (newValue <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Use setTimeout to avoid setState during render
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 0);
          return 0;
        }
        return newValue;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [location.pathname, navigate]);

  const handleImmediateRedirect = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-neutral-600 mb-4">Página não encontrada</p>
        <p className="text-neutral-500 mb-6">
          Redirecionando automaticamente em {countdown} segundos...
        </p>
        <div className="space-y-3">
          <button
            onClick={handleImmediateRedirect}
            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Ir para Dashboard Agora
          </button>
          <div>
            <a
              href="/"
              className="text-brand-700 hover:text-brand-900 underline text-sm"
            >
              Ou clique aqui para voltar ao início
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
