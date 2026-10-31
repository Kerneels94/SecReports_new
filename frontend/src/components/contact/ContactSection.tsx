/**
 * ContactSection — landing-page enquiry form that emails the support inbox.
 * Uses lightweight local validation so the landing page does not ship
 * react-hook-form or Zod.
 */
"use client";

import { useState } from "react";
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
    <div className="section" id="contact">
      <div className="wrap contact">
        <div>
          <p className="kicker">Contact</p>
          <h2 className="h2">Talk to our team</h2>
          <p className="lead">
            Tell us about your team and reporting needs. We&apos;ll come back
            with a recommendation within one business day.
          </p>
          <ul className="contact-list">
            <li>
              <span className="icon-box">
                <svg className="icon" aria-hidden="true">
                  <use href="#i-phone" />
                </svg>
              </span>
              <span>
                <small>Call us</small>
                <a href="tel:+27626496474">062 649 6474</a>
              </span>
            </li>
            <li>
              <span className="icon-box">
                <svg className="icon" aria-hidden="true">
                  <use href="#i-mail" />
                </svg>
              </span>
              <span>
                <small>Email</small>
                <a href="mailto:support@secreports.co.za">
                  support@secreports.co.za
                </a>
              </span>
            </li>
            <li>
              <span className="icon-box">
                <svg className="icon" aria-hidden="true">
                  <use href="#i-pin" />
                </svg>
              </span>
              <span>
                <small>Visit</small>
                48B Rhyolite, Zwartkop
              </span>
            </li>
          </ul>
        </div>
        <div className="card">
          {sent ? (
            <div className="done">
              <span className="icon-box">
                <svg className="icon" aria-hidden="true">
                  <use href="#i-check" />
                </svg>
              </span>
              <h3>Message sent</h3>
              <p>Thanks — we&apos;ll get back to you within one business day.</p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 18 }}
                onClick={() => setSent(false)}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form className="form" onSubmit={onSubmit} noValidate>
              <div>
                <h3 style={{ fontSize: 20 }}>Send us a message</h3>
                <p className="hint" style={{ marginTop: 6 }}>
                  We reply to every enquiry.
                </p>
              </div>
              {error && (
                <div
                  className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20"
                  role="alert"
                >
                  {error}
                </div>
              )}
              <div className="form-row">
                <div>
                  <label className="label" htmlFor="contact-name">
                    Name
                  </label>
                  <input
                    className="input"
                    id="contact-name"
                    name="name"
                    autoComplete="name"
                    placeholder="John Doe"
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p className="text-sm text-danger" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="contact-email">
                    Email
                  </label>
                  <input
                    className="input"
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.co.za"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <p className="text-sm text-danger" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="label" htmlFor="contact-company">
                  Company
                </label>
                <input
                  className="input"
                  id="contact-company"
                  name="company"
                  autoComplete="organization"
                  placeholder="Your Security Company"
                  aria-invalid={!!errors.company}
                />
                {errors.company && (
                  <p className="text-sm text-danger" role="alert">
                    {errors.company}
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="contact-message">
                  Message
                </label>
                <textarea
                  className="input"
                  id="contact-message"
                  name="message"
                  placeholder="How can we help?"
                  aria-invalid={!!errors.message}
                />
                {errors.message && (
                  <p className="text-sm text-danger" role="alert">
                    {errors.message}
                  </p>
                )}
              </div>
              <button
                className="btn btn-primary btn-block"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send message"}
                <svg className="icon icon-sm" aria-hidden="true">
                  <use href="#i-send" />
                </svg>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
