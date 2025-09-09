import React from "react";

export default function Portfolio() {
  return (
    <main className="min-h-screen bg-white text-gray-900 p-6 md:p-12">
      <section className="max-w-4xl mx-auto space-y-12">
        <header className="text-center">
          <h1 className="text-4xl font-bold">Tampara Venkata Santosh Anish Dora</h1>
          <p className="mt-2 text-xl text-gray-600">
            Full Stack Software Engineer | Building AI Applications
          </p>
          <p className="mt-1">
            Dublin, CA, 94568 ·
            <a href="tel:+19252163699" className="text-blue-600 hover:underline ml-1">
              +1-925-216-3699
            </a>
            ·
            <a href="mailto:anishdora2755@gmail.com" className="text-blue-600 hover:underline ml-1">
              anishdora2755@gmail.com
            </a>
          </p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="https://www.linkedin.com/in/anish-dora" className="text-blue-600 hover:underline">
              LinkedIn
            </a>
            <a href="https://github.com/AnishDora" className="text-blue-600 hover:underline">
              GitHub
            </a>
          </div>
        </header>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Skills</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 list-disc list-inside">
            <li>
              <strong>Languages:</strong> Java, Python, Dart, JavaScript
            </li>
            <li>
              <strong>Frameworks:</strong> Next.js, React, Spring, SpringBoot, Spring AI, Tailwind
            </li>
            <li>
              <strong>AI Frameworks &amp; Tools:</strong> LangChain, LangGraph
            </li>
            <li>
              <strong>LLM Techniques:</strong> Prompt Engineering, Retrieval-Augmented Generation (RAG)
            </li>
            <li>
              <strong>Distributed Systems:</strong> Kafka, REST APIs, Microservices
            </li>
            <li>
              <strong>Databases:</strong> MySQL, PostgreSQL
            </li>
            <li>
              <strong>Cloud Platforms:</strong> AWS, Supabase
            </li>
            <li>
              <strong>Deep Learning &amp; NLP:</strong> Neural Networks, Transformers, Large Language Models (ChatGPT, Claude)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Professional Experience</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold">Sunwave Health</h3>
              <p className="italic">Software Engineer · Remote · Jun 2023 – Present</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Designed and integrated Zoom video conferencing with the internal calendar system to support single and recurring appointments, session management, and live editing. Reduced scheduling-related support tickets by 30% and improved reliability.</li>
                <li>Orchestrated a referral and account merge module using Dart and Java to consolidate fragmented patient records across EMR and CRM systems, increasing data integrity by 40% and reducing manual reconciliation time by 50%.</li>
                <li>Automated provider payment reporting using Java, improved financial communication timeliness to 100% for 70+ providers and reduced manual workload by 5+ hours/week.</li>
                <li>Launched the Outpatient Methadone Management module to support patient intake, dosage tracking, medication scheduling, and compliance workflows, expanded platform capabilities for treatment programs, and drove 15% growth in outpatient user adoption.</li>
                <li>Collaborated with cross-functional teams (PMs, QA, clinicians) to define API contracts, write integration tests, and validate end-to-end workflows using Postman, contributing to a 20% reduction in release-cycle bugs.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold">Deloitte India (USI)</h3>
              <p className="italic">Software Engineer Intern · Remote · Jan 2022 – Jun 2022</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Led migration of core modules from legacy .NET to Angular, TypeScript, and SaaS, modernizing Deloitte’s internal iRpm platform used by 5,000+ employees.</li>
                <li>Engineered reusable UI components using Angular, to boost responsiveness and accessibility in high-traffic modules, leading to a 20% reduction in UI-related issues.</li>
                <li>Spearheaded the integration of automated testing within UI workflows, resulting in a 60% reduction in testing time and improving the accessibility score from 60 to 85 WCAG standards.</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Education</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold">Santa Clara University</h3>
              <p className="italic">Master of Science in Computer Science and Engineering · Sep 2022 – Jun 2024 · GPA: 3.58/4.0</p>
              <p>Coursework: Distributed Systems, Database Management Systems, Web Technologies, Algorithms, Machine Learning</p>
            </div>
            <div>
              <h3 className="text-xl font-bold">GITAM University</h3>
              <p className="italic">Bachelor of Technology in Computer Science and Engineering · Jun 2018 – Apr 2022 · GPA: 8.88/10</p>
              <p>Coursework: Object-Oriented Programming, Operating Systems, Data Structures, Web Development</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Projects</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold">Chat with PDFs - Full-Stack RAG Application</h3>
              <p className="italic">Aug 2025 – Sept 2025</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Developed a multitenant PDF Question and Answer application using Next.js, TypeScript, Supabase (Postgres, pgvector, Storage), Clerk, and OpenAI. Supported 75+ PDF uploads, concurrent chat sessions with a streaming UI, an embedded PDF viewer, and secure authentication with login, logout, and session management.</li>
                <li>Implemented an ingestion workflow with private storage upload, text extraction using pdf-parse/pdf.js, and text chunking (~1200 chars with 200 overlap). Generated embeddings with text-embedding-3-small and optimized retrieval via pgvector and SQL RPC, achieving 140ms median retrieval latency.</li>
                <li>Leveraged LangChain for retrieval orchestration, prompt templating, and conversation memory with rolling summaries. Indexed 75 PDFs and 2,100 pages with end-to-end answer time of 1.9s and processing cost of $0.05/100 queries.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold">AI Research Assistant - Chrome Extension</h3>
              <p className="italic">Aug 2025</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Developed a side-panel Chrome extension for instant text operations, including summarization, paraphrasing, simplification, and bulleting using Spring AI. Reduced research time by 60% with sub-3 second response times.</li>
                <li>Implemented domain-based note organization that auto-tagged and filed notes by source website. Improved retrieval efficiency and kept research notes centralized.</li>
                <li>Created a non-intrusive user interface with selection-based triggers that worked across websites without disrupting workflow using React and TailwindCSS. Ensured consistent performance across 50+ tested web pages.</li>
                <li>Integrated an AI-powered Gmail extension into the native reply modal using JavaScript. Analyzed entire mail threads to generate context-aware replies in multiple tones and cut email drafting time by 70%.</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Publications</h2>
          <ul className="list-disc list-inside">
            <li>“A Graph Invariant Based TGO Model for RailTel Optical Networks”, Sixth International Conference on Intelligent Computing and Applications (ICICA 2020), Springer, Singapore.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}
