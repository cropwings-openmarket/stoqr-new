"use server"

interface ContactFormData {
  name: string
  email: string
  company?: string
  message: string
}

export async function submitContactForm(data: ContactFormData) {
  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        access_key: process.env.WEB3FORMS_ACCESS_KEY, // Now using server-side env var
        name: data.name,
        email: data.email,
        company: data.company || "Not provided",
        message: data.message,
        subject: "New Contact Form Submission from Stoqr",
      }),
    })

    const result = await response.json()

    if (result.success) {
      return { success: true }
    } else {
      return { success: false, error: "Failed to send message" }
    }
  } catch (error) {
    console.error("Form submission error:", error)
    return { success: false, error: "Failed to send message" }
  }
}
