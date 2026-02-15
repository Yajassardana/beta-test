"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex flex-col items-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Image
            src="/logo.jpeg"
            alt="Beta Test logo"
            width={180}
            height={180}
            className="rounded-base border-2 border-border shadow-shadow"
            priority
          />
        </motion.div>

        <motion.h1
          className="mt-8 font-heading text-5xl tracking-tight text-foreground sm:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Beta Test
        </motion.h1>

        <motion.p
          className="mt-4 font-heading text-xl text-text-secondary sm:text-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          Practice the hardest conversations before they happen.
        </motion.p>

        <motion.p
          className="mx-auto mt-6 max-w-lg text-base text-text-muted"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Real scenarios. Real reactions. See what your child actually hears.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className="mt-10"
        >
          <Link href="/scenarios">
            <Button variant="default" size="lg">
              Start practicing
            </Button>
          </Link>
        </motion.div>

        <motion.footer
          className="mt-16 text-sm text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          Built for the Anthropic Hackathon, Feb 2026
        </motion.footer>
      </main>
    </div>
  );
}
