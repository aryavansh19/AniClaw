import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Terms() {
    return (
        <main className="bg-black text-white min-h-screen flex flex-col selection:bg-[#E50914] selection:text-white">
            <Navbar />

            <div className="flex-grow pt-32 pb-20 px-6 max-w-4xl mx-auto w-full">
                <h1 className="text-4xl md:text-5xl font-black mb-8 tracking-tight text-[#E50914] drop-shadow-[0_0_15px_rgba(229,9,20,0.5)]">Terms of Service</h1>

                <div className="space-y-8 text-gray-300 leading-relaxed text-lg">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using Ani-Claw ("Service"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
                        <p>
                            Ani-Claw provides instant WhatsApp notifications and direct streaming links for the latest anime episode releases. We aggregate publicly available release schedules and provide timely alerts to subscribed users.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. User Responsibilities</h2>
                        <p>
                            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree not to use the Service for any unlawful purpose or in any way that interrupts or damages the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Third-Party Links</h2>
                        <p>
                            Our Service includes links to third-party streaming platforms. We do not host any anime content ourselves. We are not responsible for the content, privacy policies, or practices of any third-party websites or services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. Disclaimer of Warranties</h2>
                        <p>
                            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, either express or implied, regarding the reliability, accuracy, or availability of the schedule data or notifications.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Limitation of Liability</h2>
                        <p>
                            In no event shall Ani-Claw or its operators be liable for any indirect, incidental, special, consequential or punitive damages arising out of your use of the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">7. Changes to Terms</h2>
                        <p>
                            We reserve the right to modify these terms at any time. We will indicate at the top of this page the date these terms were last updated. Your continued use of the Service after such changes constitutes acceptance of the new terms.
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
