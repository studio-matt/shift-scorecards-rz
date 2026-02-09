"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Search, HelpCircle, MessageCircle } from "lucide-react"

const faqs = [
  {
    id: "1",
    question: "How do I create my first scorecard?",
    answer:
      'To create your first scorecard, navigate to the Dashboard and click the "Create New Scorecard" button. You can either start from scratch by adding questions manually or choose from our pre-built templates. Templates include categories like Team Performance, Customer Satisfaction, and Project Management.',
  },
  {
    id: "2",
    question: "How often are scorecard results sent out?",
    answer:
      "Scorecard results are typically sent out on a weekly basis, though administrators can configure the frequency to be daily, weekly, bi-weekly, or monthly. You will receive an email notification when a new scorecard is available for you to complete.",
  },
  {
    id: "3",
    question: "What types of graphs are available for data visualization?",
    answer:
      "Shift Scorecard offers several data visualization options including line charts for trends over time, bar charts for department comparisons, radar charts for multi-dimensional analysis, and progress indicators for individual metrics. All charts are interactive and can be filtered by department, time period, and other dimensions.",
  },
  {
    id: "4",
    question: "Can I customize the pre-built templates?",
    answer:
      "Yes, all pre-built templates are fully customizable. You can add, remove, or modify questions, change the scoring scales, and adjust the logic rules. Customized templates can be saved as new templates for future use.",
  },
  {
    id: "5",
    question: "How do I invite team members to participate?",
    answer:
      'As an administrator, you can invite team members by navigating to the Manage Users section. Click "Invite User" and enter their email address. They will receive an invitation link that pre-populates your organization name so they can quickly join the right team.',
  },
  {
    id: "6",
    question: "What happens to my data if I cancel my subscription?",
    answer:
      "Your data is retained for 90 days after cancellation. During this period, you can export all your scorecard data, reports, and analytics. After 90 days, data is permanently deleted in accordance with our data retention policy.",
  },
  {
    id: "7",
    question: "Is there a mobile app available?",
    answer:
      "Shift Scorecard is fully responsive and works great on mobile browsers. We are actively developing native iOS and Android apps that will be available in the near future. Sign up for our newsletter to be notified when mobile apps launch.",
  },
  {
    id: "8",
    question: "How can I export my scorecard data?",
    answer:
      'You can export your data from the Dashboard by clicking the "Download Results" button. Exports are available in CSV, PDF, and Excel formats. Administrators can export data for the entire organization or filter by department, date range, or individual users.',
  },
]

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          Frequently Asked Questions
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
          Find answers to common questions about Shift Scorecard and how to make
          the most of your scorecard tracking experience.
        </p>
      </div>

      {/* Search */}
      <div className="mx-auto mb-8 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search frequently asked questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* FAQ List */}
      <div className="mx-auto max-w-2xl">
        <Accordion type="single" collapsible className="w-full">
          {filteredFaqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="text-left text-sm font-medium text-foreground">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {filteredFaqs.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              No results found for &quot;{searchQuery}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Contact Support CTA */}
      <Card className="mx-auto mt-12 max-w-2xl">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Still have questions?
          </h2>
          <p className="text-sm text-muted-foreground">
            {"Can't find the answer you're looking for? Our support team is here to help."}
          </p>
          <Button>
            <MessageCircle className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
