/**
 * ContactSection — landing-page enquiry form that emails the support inbox.
 * Uses the shared design system (Card, Input, Button) and lightweight local
 * validation so the landing page does not ship react-hook-form or Zod.
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { contactService } from "@/services";

type ContactValues = {
  name: string;
  email: string;
  company: string;
  message: string;
};

type ContactErrors = Partial<Record<keyof ContactValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates the contact form and returns per-field error messages. */
export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};

  if (!values.name.trim()) errors.name = "Name is required";
  else if (values.name.length > 255) errors.name = "Name is too long";

  if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = "Invalid email address";
  }

  if (values.company.length > 255) {
    errors.company = "Company name is too long";
  }

  if (!values.message.trim()) errors.message = "Message is required";
  else if (values.message.length > 5000) {
    errors.message = "Message must be under 5000 characters";
  }

  return errors;
}

/** Contact form section for the marketing landing page. */
export default function ContactSection() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const values: ContactValues = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      company: String(data.get("company") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    const nextErrors = validateContact(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      setError(null);
      await contactService.send({
        name: values.name,
        email: values.email,
        company: values.company || undefined,
        message: values.message,
      });
      form.reset();
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send your message",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="border-t border-border-light">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-text">Talk to our team</h2>
          <p className="mt-4 text-text-secondary">
            Tell us a bit about your team and reporting needs and we will come
            back with a recommendation within one business day.
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
                className="cursor-pointer font-medium text-primary hover:underline transition-colors"
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
                  onSubmit={onSubmit}
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
                    name="name"
                    placeholder="John Doe"
                    error={errors.name}
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="you@company.co.za"
                    error={errors.email}
                  />
                  <Input
                    label="Company"
                    name="company"
                    placeholder="Your Security Company"
                    error={errors.company}
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
                      name="message"
                      rows={5}
                      placeholder="How can we help?"
                      aria-invalid={!!errors.message}
                      aria-describedby={
                        errors.message ? "contact-message-error" : undefined
                      }
                      className="w-full resize-y rounded-lg border border-border-light bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-secondary/60 outline-none transition-all duration-150 focus:ring-2 focus:ring-primary"
                    />
                    {errors.message && (
                      <p
                        id="contact-message-error"
                        className="text-sm text-danger"
                        role="alert"
                      >
                        {errors.message}
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
