"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Shield, ArrowRight, Brain, ClipboardCheck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const LottiePlayer = dynamic(() => import("lottie-react"), { ssr: false });
import welcomeData from "../../public/lottie/welcome.json";

const features = [
  {
    icon: Brain,
    title: "IA Integrada",
    description: "Análisis automático de fotos para detectar riesgos laborales con modelo preentrenado.",
  },
  {
    icon: ClipboardCheck,
    title: "Gestión de Acciones",
    description: "Asigna, da seguimiento y cierra acciones correctivas con evidencia fotográfica.",
  },
  {
    icon: BarChart3,
    title: "Dashboard en Tiempo Real",
    description: "KPIs, tendencias y exportación de datos para la mejora continua.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl">Horizonte Vision</span>
        </div>
        <Link href="/login">
          <Button variant="outline">Iniciar Sesión</Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Seguridad laboral{" "}
              <span className="text-primary">inteligente</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              Reporta riesgos en segundos con análisis de IA, gestiona acciones
              correctivas y visualiza métricas de seguridad en tiempo real.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  Iniciar <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Ver Demo
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="w-72 h-72 lg:w-96 lg:h-96">
              <LottiePlayer animationData={welcomeData} loop autoplay />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-center mb-12"
        >
          Funcionalidades Clave
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-card rounded-2xl p-6 shadow-sm border hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            Horizonte Vision © {new Date().getFullYear()}
          </div>
          <p className="text-xs text-muted-foreground">
            Plataforma de gestión de seguridad laboral con IA
          </p>
        </div>
      </footer>
    </div>
  );
}
