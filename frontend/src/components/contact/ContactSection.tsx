/**
 * ContactSection — landing-page enquiry form that emails the support inbox.
 * Uses the shared design system (Card, Input, Button) and validates with Zod
 * before submitting through contactService.
 */
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { contactService } from "@/services";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email address"),
  company: z.string().max(255, "Company name is too long").optional(),
  message: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message must be under 5000 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

/** Contact form section for the marketing landing page. */
export default function ContactSection() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      setError(null);
      await contactService.send({
        name: data.name,
        email: data.email,
        company: data.company || undefined,
        message: data.message,
      });
      reset();
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send your message",
      );
    }
  };

  return (
    <section id="contact" className="border-t border-border-light">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-text">Talk to our team</h2>
          <p className="mt-4 text-text-secondary">
            Tell us about your sites and headcount and we will come back with a
            recommendation within one business day.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-6 justify-center">
            <p className="text-sm text-text-secondary">Contact: 0626496474</p>
            <p className="text-sm text-text-secondary">
              Address: 48B Rhyolite, Zwartkop
            </p>
            <p className="text-sm text-text-secondary">
              Prefer email?{" "}
              <a
                href="mailto:support@secreports.co.za"
                className="font-medium text-primary hover:underline transition-colors"
              >
                support@secreports.co.za
              </a>
            </p>
          </div>

          <Card variant="elevated" className="animate-slide-up">
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <p className="mt-1 text-sm text-text-secondary">
                We reply to every enquiry.
              </p>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary-hover shadow-lg shadow-primary/25">
                    <svg
                      className="h-7 w-7 text-gray-900"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-text">
                    Message sent
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Thanks — our team will be in touch shortly.
                  </p>
                  <Button
                    variant="ghost"
                    className="mt-4"
                    onClick={() => setSent(false)}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  className="flex flex-col gap-4"
                >
                  {error && (
                    <div
                      className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}
                  <Input
                    label="Name"
                    placeholder="John Doe"
                    error={errors.name?.message}
                    {...register("name")}
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@company.co.za"
                    error={errors.email?.message}
                    {...register("email")}
                  />
                  <Input
                    label="Company"
                    placeholder="Your Security Company"
                    error={errors.company?.message}
                    {...register("company")}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="contact-message"
                      className="text-sm font-medium text-text/90"
                    >
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      rows={5}
                      placeholder="How can we help?"
                      aria-invalid={!!errors.message}
                      aria-describedby={
                        errors.message ? "contact-message-error" : undefined
                      }
                      className="w-full resize-y rounded-lg border border-border-light bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-secondary/60 outline-none transition-all duration-150 focus:ring-2 focus:ring-primary"
                      {...register("message")}
                    />
                    {errors.message && (
                      <p
                        id="contact-message-error"
                        className="text-sm text-danger"
                        role="alert"
                      >
                        {errors.message.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    loading={isSubmitting}
                    className="w-full"
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
