import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Privacy() {
    return (
        <main className="bg-black text-white min-h-screen flex flex-col selection:bg-[#E50914] selection:text-white">
            <Navbar />

            <div className="flex-grow pt-32 pb-20 px-6 max-w-4xl mx-auto w-full">
                <h1 className="text-4xl md:text-5xl font-black mb-8 tracking-tight text-[#E50914] drop-shadow-[0_0_15px_rgba(229,9,20,0.5)]">Privacy Policy</h1>

                <div className="space-y-8 text-gray-300 leading-relaxed text-lg">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
                        <p>
                            When you sign up for Ani-Claw, we collect essential information strictly necessary for providing our notification service. This primary data point is your <strong>WhatsApp phone number</strong> and a username to personalize your experience.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
                        <p>
                            Your phone number is used exclusively for:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li>Sending automated WhatsApp alerts when your tracked anime drops a new episode.</li>
                            <li>Providing essential account and security updates.</li>
                            <li>Customer support interactions via the Contact form.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Data Sharing</h2>
                        <p>
                            <strong>We do not sell, trade, or rent your personal information to third parties.</strong> We only share data with trusted service providers necessary to operate the Service, such as our WhatsApp API provider (Meta) and database provider (Supabase), under strict confidentiality agreements.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
                        <p>
                            We implement industry-standard security measures to protect your personal information. Authentication is handled securely via Supabase, and all backend communication runs over encrypted HTTPS.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. Your Rights & Account Deletion</h2>
                        <p>
                            You have the right to access, update, or delete your information at any time. If you choose to delete your account via the Dashboard Settings, your phone number and all associated tracking data will be permanently and irreversibly purged from our database.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Cookies and Tracking</h2>
                        <p>
                            We use minimal cookies necessary for session management and authentication. We do not use intrusive third-party ad-tracking scripts on the dashboard.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">7. Contact Us</h2>
                        <p>
                            If you have any questions or concerns regarding this Privacy Policy, please reach out to us at <strong>support@ani-claw.com</strong> or via the Contact form on our landing page.
                        </p>
                    </section>

                    <p className="text-sm text-gray-500 mt-12 pt-8 border-t border-white/10">
                        Last updated: March 2026
                    </p>
                </div>
            </div>

            <Footer />
        </main>
    );
}
