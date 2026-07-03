import React, { useState, useEffect , useRef } from 'react';
import './App.css';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { AlertCircle, BookOpen, Code, Users, Star, ArrowRight, CheckCircle, Clock, Target, Trophy, Zap, PlayCircle, Menu, X, Calendar, GraduationCap, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription } from './components/ui/alert';
import axios from 'axios';
import Typewriter from "typewriter-effect";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import emailjs from "emailjs-com"
import Aaron from './Images/Aaron_Govan_Pic.jpg'
import Diana from './Images/Diana_Chiorescu.jpg'
import Lena from './Images/Lena_Farima.png'
import Maryna from './Images/Maryna_Nesterenko.jpg'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const raz_key = process.env.REACT_APP_RAZORPAY_KEY_ID;
// console.log("Razor key is" , raz_key);

const App = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [currentStep, setCurrentStep] = useState("form"); 
  const [enrollmentData, setEnrollmentData] = useState(null)
  const [enrollmentForm, setEnrollmentForm] = useState({
    name: '',
    email: '',
    country: '',
    phone_number: '',
    experience_level: '',
    course_interest: 'SDET Bootcamp'
  });
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  });

  const contactFormRef = useRef()
  const enrollmentFormRef = useRef();
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricingMode, setPricingMode] = useState('onetime'); // 'monthly' or 'onetime'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  
  

  useEffect(() => {
    if (selectedLevel === 'all') {
      setFilteredCourses(courses);
    } else {
      setFilteredCourses(courses.filter(course => course.level.toLowerCase() === selectedLevel.toLowerCase()));
    }
  }, [courses, selectedLevel]);

  
  const SERVICE_ID = process.env.REACT_APP_SERVICE_ID;
  const TEMPLATE_ID_TO_YOU = process.env.REACT_APP_TEMPLATE_ID_TO_YOU;
  const TEMPLATE_ID_TO_CUSTOMER = process.env.REACT_APP_TEMPLATE_ID_TO_CUSTOMER;
  const PUBLIC_KEY = process.env.REACT_APP_PUBLIC_KEY;

 const handleNewEnrollment = () => {
    setCurrentStep("form")
    setEnrollmentForm({
      name: "",
      email: "",
      country: "",
      phone_number: "",
      experience_level: "",
      course_interest: "SDET Bootcamp",
    })
    setSubmitStatus(null)
  }

  const handleEnrollmentSubmit = async (e) => {
  e.preventDefault()
  setIsSubmitting(true)
  setSubmitStatus(null)

  try {
    // Validate form
    if (
      !enrollmentForm.name ||
      !enrollmentForm.email ||
      !enrollmentForm.country ||
      !enrollmentForm.phone_number ||
      !enrollmentForm.experience_level
    ) {
      setSubmitStatus({ type: "error", message: "Please fill in all required fields" })
      setIsSubmitting(false)
      return
    }

    // Save enrollmentForm data into enrollmentData for payment
    setEnrollmentData({ ...enrollmentForm })

    // Move to payment step
    setCurrentStep("payment")
    setIsSubmitting(false)
  } catch (err) {
    console.error("Error:", err)
    setSubmitStatus({ type: "error", message: err.message || "Something went wrong" })
    setIsSubmitting(false)
  }
}


 const handlePaymentClick = async () => {
  if (!enrollmentData || !enrollmentData.name) {
    alert("Please fill out your details before making payment.")
    return
  }

  setIsSubmitting(true)

  try {
    const amount = 100 * 100 // cents
    const currency = "USD"
    const receiptId = "enrollment_" + Date.now()

    // 1) Create order on backend
    const createRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/create-order`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ amount, currency, receipt: receiptId }),
})

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}))
      throw new Error("Failed to create order: " + (err.error || createRes.statusText))
    }

    const order = await createRes.json()
    // console.log("Order created (frontend):", order)

    let paymentCancelled = false

    // 2) Razorpay options
    const options = {
      key: raz_key, // make sure this is your Razorpay key
      amount: order.amount,
      currency: order.currency || currency,
      name: "Chirag Khimani",
      description: "Course Enrollment Payment",
      order_id: order.id,
      handler: async (razorpayResponse) => {
        try {
          if (paymentCancelled) {
            console.warn("Payment was cancelled, ignoring handler response")
            return
          }

          // Validate payment with backend
          const validateRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/order/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(razorpayResponse),
          })

          const jsonRes = await validateRes.json().catch(() => null)
          // console.log("Validation Response:", validateRes.status, jsonRes)

          if (!validateRes.ok || jsonRes?.msg !== "success") {
            alert("Payment validation failed. Please contact support.")
            setIsSubmitting(false)
            return
          }

          // Send emails (admin + customer) safely
          const emailResults = await Promise.allSettled([
            emailjs.send(
              SERVICE_ID,
              TEMPLATE_ID_TO_YOU,
              {
                email: enrollmentData.email,
                fullName: enrollmentData.name,
                phone: enrollmentData.phone_number,
                country: enrollmentData.country,
                courseInterest: enrollmentData.course_interest,
                experience: enrollmentData.experience_level,
                paymentId: razorpayResponse.razorpay_payment_id,
                orderId: razorpayResponse.razorpay_order_id,
              },
              PUBLIC_KEY
            ),
            emailjs.send(
              SERVICE_ID,
              TEMPLATE_ID_TO_CUSTOMER,
              {
                email: enrollmentData.email,
                fullName: enrollmentData.name,
                courseInterest: enrollmentData.course_interest,
                experience: enrollmentData.experience_level,
                paymentId: razorpayResponse.razorpay_payment_id,
                orderId: razorpayResponse.razorpay_order_id,
              },
              PUBLIC_KEY
            )
          ])

          const failedEmails = emailResults.filter(r => r.status === "rejected")
          if (failedEmails.length > 0) {
            // console.log(failedEmails)
            console.warn("Some emails failed to send:", failedEmails)
            alert("Payment successful but failed to send some confirmation emails.")
          } else {
            console.log("All emails sent successfully")
          }

          // Move to submitted state
          setCurrentStep("submitted")
          setIsSubmitting(false)
        } catch (err) {
          console.error("Error in payment handler:", err)
          alert("Error while processing payment. Please contact support.")
          setIsSubmitting(false)
        }
      },
      prefill: {
        name: enrollmentData.name,
        email: enrollmentData.email,
        contact: enrollmentData.phone_number,
      },
      theme: { color: "#3399cc" },
      modal: {
        ondismiss: () => {
          // console.log("Payment popup closed by user")
          alert("Payment cancelled by user.")
          setIsSubmitting(false)
        },
      },
    }

    const rzp = new window.Razorpay(options)

    rzp.on("payment.failed", (resp) => {
      console.error("Payment failed event:", resp)
      alert("Payment Failed: " + (resp.error?.description || "Unknown error"))
      setIsSubmitting(false)
    })

    rzp.open()
  } catch (err) {
    console.error("Error creating order or opening checkout:", err)
    alert(err.message || "Something went wrong during payment. Please try again.")
    setIsSubmitting(false)
  }
}

const handleBackToForm = () => {
    setCurrentStep("form")
    setSubmitStatus(null)
}

  const handleContactSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contactForm),
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ Message sent successfully!");
      setContactForm({ name: "", email: "", message: "" }); // clear form
    } else {
      alert("❌ Failed to send message: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("⚠ Something went wrong. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};

  const handleInputChange = (form, setForm) => (field) => (value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const stats = [
    { icon: Users, label: 'Students Trained', value: '5,000+', iconColor: 'text-blue-500', type: 'simple' },
    { icon: Trophy, label: 'Highest Package Offered', value: '$180k', iconColor: 'text-yellow-500', type: 'trophy' },
    { icon: Star, label: 'Industry Rating', value: '4.9/5', iconColor: 'text-yellow-500', type: 'stars' },
    { icon: Target, label: 'Job Placement', value: '85%', iconColor: 'text-red-500', type: 'target' }
  ];

  const testimonials = [
    {
      name: 'Aaron Govan',
      role: 'Quality Assurance Engineer, Amazon',
      rating: 5,
      comment: 'I joined this bootcamp with zero IT background, and honestly, I was nervous at first. But Chirag & Shyams way of explaining every topic step-by-step made it so easy to follow. He’s super patient, never rushes and always makes sure everyone understands before moving on. Best decision I made this year!',
      // image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
      image : Aaron
    },
    {
      name: 'Diana Chiorescu',
      role: 'Senior Automation Engineer, GEICO',
      rating: 5,
      comment: 'This course doesn’t just teach tools; it teaches mindset. The way Chirag connects theory with real project scenarios helped me understand why things are done, not just how. The examples are relevant to what actually happens in QA.basics to advanced automation frameworks. The instructors are industry experts with real experience.',
      image: Diana
    },
    {
      name: 'Lena Farima',
      role: 'Quality Engineer, Humana', 
      rating: 5,
      comment: 'The classes are well-structured and filled with real-world examples. What I loved most is how supportive the environment is, no one is left behind. Chirag & Shyam both genuinely cares about each student’s progress and provides personal attention whenever someone is stuck.comprehensive coverage of testing tools and methodologies gave me the confidence to tackle complex automation challenges in my current role.',
      image: Lena
    } , 
    {
      name: 'Maryna Nesterenko',
      role: 'Senior Software Test Engineer, Natera ', 
      rating: 5,
      comment: 'What really sets this bootcamp apart is the constant support even outside class hours. The WhatsApp group is always active, and Chirag personally replies to doubts, no matter how small. His patience is unmatched. he’s ready re-explain a topic multiple times.comprehensive coverage of testing tools and methodologies gave me the confidence to tackle complex automation challenges in my current role.',
      image: Maryna
    }
  ];

  const [index, setIndex] = useState(0);

  const nextTestimonial = () => {
    setIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setIndex(
      (prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextTestimonial();
    }, 4000); // auto-slide every 4 seconds
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header Navigation */}
      <header className="bg-gradient-to-r from-slate-900/80 via-blue-900/70 to-purple-900/80 backdrop-blur-md border-b border-blue-500/20 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-2 shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-white font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Chirag Khimani</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('courses-section')}
                className="text-blue-200/80 hover:text-white hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-all duration-200 font-medium"
              >
                Course Details
              </button>
              <button
                onClick={() => scrollToSection('curriculum-section')}
                className="text-blue-200/80 hover:text-white hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-all duration-200 font-medium"
              >
                Course Curriculum
              </button>
              <button
                onClick={() => scrollToSection('pricing-section')}
                className="text-blue-200/80 hover:text-white hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-all duration-200 font-medium"
              >
                Pricing Plans
              </button>
              <button
                onClick={() => scrollToSection('aboutus-section')}
                className="text-blue-200/80 hover:text-white hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-all duration-200 font-medium"
              >
                About Us
              </button>
              <button
                onClick={() => scrollToSection('enrollment-section')}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-2 rounded-full font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Contact Us
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-blue-200 hover:text-white hover:bg-blue-500/20 p-2 rounded-lg transition-all duration-200"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-gradient-to-r from-slate-900/90 to-blue-900/90 backdrop-blur-md border-t border-blue-500/20">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <button
                  onClick={() => scrollToSection('courses-section')}
                  className="block w-full text-left px-3 py-2 text-blue-200/80 hover:text-white hover:bg-blue-500/20 rounded-md transition-colors duration-200"
                >
                  Course Details
                </button>
                <button
                  onClick={() => scrollToSection('curriculum-section')}
                  className="block w-full text-left px-3 py-2 text-blue-200/80 hover:text-white hover:bg-blue-500/20 rounded-md transition-colors duration-200"
                >
                  Course Curriculum
                </button>
                <button
                  onClick={() => scrollToSection('pricing-section')}
                  className="block w-full text-left px-3 py-2 text-blue-200/80 hover:text-white hover:bg-blue-500/20 rounded-md transition-colors duration-200"
                >
                  Pricing Plans
                </button>
                <button
                  onClick={() => scrollToSection('about-section')}
                  className="block w-full text-left px-3 py-2 text-blue-200/80 hover:text-white hover:bg-blue-500/20 rounded-md transition-colors duration-200"
                >
                  About Us
                </button>
                <button
                  onClick={() => scrollToSection('enrollment-section')}
                  className="block w-full text-left px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-md font-semibold mt-2 shadow-lg"
                >
                  Contact Us
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Minimal Notification Banner */}
      <div className="top-16 z-50 bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm border-b border-orange-500/30 py-2 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center space-x-3 text-sm">
            <Calendar className="h-4 w-4 text-orange-400" />
            <span className="text-orange-100 font-medium">Next Batch Starts 04 December 2025</span>
            <span className="text-orange-300">•</span>
            <span className="text-orange-200 text-xs">Limited Seats Available!</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
            The Ultimate <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Software Testing</span> & Automation Bootcamp
          </h1>
          <div className="text-xl md:text-2xl text-blue-300 mb-8 font-semibold italic text-center">
  <Typewriter
    onInit={(typewriter) => {
      typewriter
        .typeString("A journey from Aspirant to Achievements")
        .callFunction(() => {
          // stop cursor blinking once typing is done
          const cursor = document.querySelector(".Typewriter__cursor");
          if (cursor) cursor.style.display = "none";
        })
        .start();
    }}
    options={{
      autoStart: true,
      loop: false,
      delay: 60,
      cursor: "|",
    }}
  />
</div>

          <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            Transform your career with our comprehensive SDET program. Learn cutting-edge automation frameworks, 
            API testing, AI Tools, and land your dream job at top tech companies.
          </p>
          
          <div className="mb-16 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 text-sm font-semibold shadow-lg rounded-full">
              🚀 From Zero to IT Professional in 6 Months
            </Badge>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 text-sm font-semibold shadow-lg rounded-full">
              ✨ Now with AI Tools
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                <div className="flex justify-center mx-auto mb-4">
                  {stat.type === 'stars' ? (
                    <Star className="h-12 w-12 text-yellow-500 fill-current drop-shadow-lg" />
                  ) : stat.type === 'target' ? (
                    <div className="text-4xl">🎯</div>
                  ) : stat.type === 'trophy' ? (
                    <div className="text-4xl">🏆</div>
                  ) : (
                    <stat.icon className={`h-12 w-12 ${stat.iconColor}`} />
                  )}
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-gray-300 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about-section" className="py-24 px-4 bg-gradient-to-r from-slate-800/50 to-purple-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-6">Why Choose Our SDET Program?</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our comprehensive program is designed by industry experts to provide hands-on experience 
              with the latest testing tools and methodologies used by top tech companies.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <img 
                src="https://images.unsplash.com/photo-1607799279861-4dd421887fb3" 
                alt="Professional programming setup" 
                className="rounded-2xl shadow-2xl w-full object-cover"
              />
            </div>
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Industry-Relevant Curriculum</h3>
                  <p className="text-gray-300">Learn the exact skills and tools used by SDET professionals at companies like Google, Microsoft, and Amazon.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-3">
                  <Code className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Hands-On Projects</h3>
                  <p className="text-gray-300">Build real automation frameworks and testing solutions that you can showcase in your portfolio.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Expert Mentorship</h3>
                  <p className="text-gray-300">Learn from experienced SDET professionals who provide personalized guidance and career advice.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-3">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Job Placement Support</h3>
                  <p className="text-gray-300">85% job placement rate with dedicated career support, interview preparation, and industry connections.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Removed Course Modules Section as requested */}

      {/* Course Details Section */}
      <section id="courses-section" className="py-24 px-4 bg-gradient-to-r from-slate-800/50 to-purple-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-6">Course Details</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Comprehensive 6-month intensive SDET program designed to transform your career in software testing
            </p>
          </div>

          <div className="flex flex-col justify-center items-center flex-wrap lg:grid lg:grid-cols-3 gap-8 mb-16">
            {/* Duration & Schedule Card */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 backdrop-blur-sm col-span-2">
              <CardContent className="p-8">
                <div className="flex items-center mb-8">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-4 mr-6">
                    <Clock className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-2">Program Duration</h3>
                    <p className="text-blue-400 text-2xl font-bold">6 Months Intensive Training</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/20">
                    <div className="flex items-center mb-4">
                      <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                      <h4 className="text-white font-bold text-lg">Weekdays</h4>
                    </div>
                    <p className="text-gray-300 mb-2">Tuesday • Wednesday • Thursday</p>
                    <p className="text-blue-400 font-bold text-xl">8:00 PM - 10:00 PM CST</p>
                    <p className="text-gray-400 text-sm mt-2">Perfect for working professionals</p>
                  </div>
                  
                  <div className="bg-purple-500/10 rounded-xl p-6 border border-purple-500/20">
                    <div className="flex items-center mb-4">
                      <div className="w-4 h-4 bg-purple-500 rounded-full mr-3"></div>
                      <h4 className="text-white font-bold text-lg">Weekends</h4>
                    </div>
                    <p className="text-gray-300 mb-2">Saturday • Sunday</p>
                    <p className="text-purple-400 font-bold text-xl">10:00 AM - 1:00 PM CST</p>
                    <p className="text-gray-400 text-sm mt-2">Hands-on practice sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Entry Level Card */}
            <Card className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border-green-500/30 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <Target className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Entry Level</h3>
                  <p className="text-green-400 text-xl font-bold mb-4">No IT Background Required</p>
                  <p className="text-gray-300">Perfect for beginners and career changers looking to enter the exciting SDET field</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features Grid */}
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-white text-center mb-12">What's Included in Your Journey</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: PlayCircle, title: "Online Classes", desc: "Attend from Anywhere!", color: "from-blue-500 to-indigo-500" },
                { icon: BookOpen, title: "Class Recordings", desc: "Access to the Recording of the Classes", color: "from-purple-500 to-pink-500" },
                { icon: CheckCircle, title: "Homework", desc: "Plenty of Examples for Homework", color: "from-green-500 to-teal-500" },
                { icon: Star, title: "Assessments", desc: "Bi Weekly Quizzes and Exams", color: "from-yellow-500 to-orange-500" },
                { icon: Users, title: "Mentorship", desc: "Weekly 1 to 1 Mentorship", color: "from-red-500 to-pink-500" },
                { icon: Code, title: "Real Projects", desc: "Real Time Mock Project Experience", color: "from-indigo-500 to-purple-500" },
                { icon: Trophy, title: "Rewards", desc: "Lots of Rewards to Motivate Students on Exams", color: "from-teal-500 to-cyan-500" },
                { icon: Target, title: "Interview Prep", desc: "Interview Preparation Sessions", color: "from-orange-500 to-red-500" }
              ].map((feature, index) => (
                <div key={index} className="group">
                  <Card className="bg-slate-800/30 border-slate-600/50 hover:bg-slate-700/50 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm h-full">
                    <CardContent className="p-6 text-center h-full flex flex-col justify-between">
                      <div>
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                          <feature.icon className="h-7 w-7 text-white" />
                        </div>
                        <h4 className="text-white font-bold text-lg mb-3">{feature.title}</h4>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-4 text-lg font-semibold rounded-full"
              onClick={() => document.getElementById('enrollment-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Your IT Journey Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Course Curriculum Section */}
      <section id="curriculum-section" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-6">Course Curriculum</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Master the essential technologies and tools used by SDET professionals worldwide
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { name: 'Java', filename: 'Java.png', color: 'from-orange-500 to-red-500' },
              { name: 'Selenium', filename: 'Selenium.png', color: 'from-green-500 to-blue-500' },
              { name: 'Cucumber', filename: 'Cucumber.png', color: 'from-green-400 to-green-600' },
              { name: 'Object Oriented Programming', filename: 'Object Oriented Programming.png', color: 'from-purple-500 to-pink-500' },
              { name: 'TestNG', filename: 'TestNG.png', color: 'from-blue-500 to-purple-500' },
              { name: 'Framework Development', filename: 'Framework Development.png', color: 'from-indigo-500 to-blue-500' },
              { name: 'Agile Methodology', filename: 'Agile Methodology.png', color: 'from-yellow-500 to-orange-500' },
              { name: 'Mock Project', filename: 'Moc Project.png', color: 'from-red-500 to-pink-500' },
              { name: 'Interview Prep', filename: 'Interview Prep.png', color: 'from-teal-500 to-green-500' },
              { name: 'Maven', filename: 'Maven.png', color: 'from-orange-600 to-red-600' },
              { name: 'GitHub', filename: 'GitHub.png', color: 'from-gray-700 to-slate-900' },
              { name: 'Jenkins', filename: 'Jenkins.png', color: 'from-blue-600 to-indigo-600' },
              { name: 'MySQL', filename: 'mysql.png', color: 'from-blue-500 to-blue-700' },
              { name: 'Postman', filename: 'Postman.png', color: 'from-orange-500 to-red-500' },
              { name: 'Rest Assured', filename: 'Rest Assured.png', color: 'from-green-500 to-teal-500' }
            ].map((tech, index) => (
              <div key={index} className="group">
                <Card className="bg-slate-800/30 border-slate-600/50 hover:bg-slate-700/50 transition-all duration-500 transform hover:scale-110 hover:rotate-2 backdrop-blur-sm relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${tech.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  <CardContent className="p-6 text-center relative z-10">
                    <div className="relative mb-4">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${tech.color} p-1 mx-auto group-hover:scale-110 transition-transform duration-500 shadow-lg group-hover:shadow-2xl`}>
                        <div className="w-full h-full bg-white rounded-xl flex items-center justify-center p-2">
                          <img 
                            src={`/icons/${tech.filename}`} 
                            alt={tech.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-600">${tech.name.charAt(0)}</div>`;
                            }}
                          />
                        </div>
                      </div>
                      <div className={`absolute -inset-2 bg-gradient-to-r ${tech.color} rounded-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 blur-lg -z-10`}></div>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-blue-400 group-hover:to-purple-400 transition-all duration-500">
                      {tech.name}
                    </h3>
                    <div className={`w-0 h-0.5 bg-gradient-to-r ${tech.color} mx-auto group-hover:w-full transition-all duration-500 rounded-full`}></div>
                  </CardContent>
                  
                  {/* Animated corner accent */}
                  <div className={`absolute top-0 right-0 w-0 h-0 group-hover:w-8 group-hover:h-8 bg-gradient-to-br ${tech.color} transition-all duration-500 opacity-60`}></div>
                </Card>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <p className="text-gray-400 mb-6">Each technology is taught with hands-on projects and real-world applications</p>
            <div className="flex flex-col md:flex-row justify-center md:space-x-4 space-y-4 md:space-y-0">
              <div className="flex items-center bg-slate-800/50 rounded-full px-6 py-3 border border-slate-600">
                <Code className="h-5 w-5 text-blue-400 mr-2" />
                <span className="text-gray-300">Hands-on Practice</span>
              </div>
              <div className="flex items-center bg-slate-800/50 rounded-full px-6 py-3 border border-slate-600">
                <Trophy className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-gray-300">Industry Standards</span>
              </div>
              <div className="flex items-center bg-slate-800/50 rounded-full px-6 py-3 border border-slate-600">
                <Target className="h-5 w-5 text-green-400 mr-2" />
                <span className="text-gray-300">Job-Ready Skills</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing-section" className="py-24 px-4 bg-gradient-to-r from-slate-800/50 to-purple-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-6">Pricing Plans</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Choose the perfect plan that fits your learning journey and career goals
            </p>
            
            {/* Pricing Toggle */}
            <div className="flex justify-center">
              <div className="bg-slate-800/50 rounded-full p-1 border border-slate-600 backdrop-blur-sm">
                <div className="flex items-center">
                  <button
                    onClick={() => setPricingMode('monthly')}
                    className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                      pricingMode === 'monthly' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setPricingMode('onetime')}
                    className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                      pricingMode === 'onetime' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Pay All in One
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Career Consultation */}
            <Card className="bg-slate-800/50 border-slate-600 backdrop-blur-sm relative hover:transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Career Consultation</h3>
                  <div className="text-4xl font-bold text-blue-400 mb-2">Free</div>
                  <p className="text-gray-300">15min Zoom Session</p>
                </div>

                <Button 

                onClick={() =>
              document.getElementById("enrollment-section")?.scrollIntoView({ behavior: "smooth" })
              }
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 mb-6">
                
                  Book A Slot
                </Button>

                <div className="space-y-4">
                  <p className="text-gray-300 mb-4">Get personalized career advice from our team on</p>
                  {[
                    'Career Selection',
                    'Questions',
                    'Roadblocks',
                    'Market Research',
                    'Resume Writing'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SDET Bootcamp - Featured */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/50 backdrop-blur-sm relative transform scale-105 hover:scale-110 transition-all duration-300">

              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 text-sm font-bold ml-[-150px]">
                  MOST POPULAR
                </Badge>
              </div>
              {/* Early Bird Badge */}
             <div className="absolute -top-4 -right-4 z-20">
      <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-5 py-3 text-sm font-bold shadow-xl transform rotate-45 origin-center mt-[30px] rounded-[7px] animate-soft-blink">
        <span className="text-white font-bold"> EARLY BIRD</span>
      </div>
      <style>
{`
@keyframes soft-blink {
  0% {
    opacity: 1;
   
  }
  50% {
    opacity: 0.4;
    
  }
  100% {
    opacity: 1;
    
  }
}

.animate-soft-blink {
  animation: soft-blink 2s ease-in-out infinite;
}
`}
</style>
      </div>




              {/* Early Bird Banner */}
              {/* <div className="absolute top-3 left-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-4 py-1 transform -rotate-3 shadow-lg">
                {pricingMode === 'monthly' ? '$100 OFF' : '20% OFF'}
              </div> */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-lg"></div>
              <CardContent className="p-8 relative z-10 pt-12">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-white mb-4">SDET Bootcamp</h3>
                  
                  {/* Early Bird Pricing */}
                  <div className="mb-4">
                    <div className="flex justify-center items-center space-x-3 mb-2">
                      <span className="text-3xl font-bold text-gray-400 line-through">
                        {pricingMode === 'monthly' ? '$1,000' : '$5,000'}
                      </span>
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-3 py-1 rounded-full text-sm font-bold animate-bounce">
                        {pricingMode === 'monthly' ? '$100 OFF' : '20% OFF'}
                      </div>
                    </div>
                    <div className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">
                      {pricingMode === 'monthly' ? '$900' : '$4,000'}
                    </div>
                  </div>
                  
                  <p className="text-gray-300">
                    {pricingMode === 'monthly' ? 'Per Month × 6 Months' : 'One Time Payment'}
                  </p>
                  {pricingMode === 'monthly' && (
                    <div className="mt-2 space-y-1">
                      <p className="text-gray-400 text-sm line-through">Regular Total: $6,000</p>
                      <p className="text-yellow-400 text-sm font-bold">Early Bird Total: $5,400 (6-Month Program)</p>
                    </div>
                  )}
                  {pricingMode === 'onetime' && (
                    <p className="text-yellow-400 text-sm font-bold mt-2">Save $1,000 with Early Bird pricing!</p>
                  )}
                  {pricingMode === 'monthly' && (
                    <p className="text-yellow-400 text-sm font-bold mt-2">Save $600 total with Early Bird pricing!</p>
                  )}
                </div>

                <Button
  onClick={() =>
    document.getElementById("enrollment-section")?.scrollIntoView({ behavior: "smooth" })
  }
  className="w-full bg-white text-blue-600 hover:bg-gray-100 font-semibold py-3 mb-6 shadow-lg hover:shadow-xl transition-all duration-300"
>
  Enroll Now
</Button>


                <div className="space-y-4">
                  <p className="text-white font-semibold mb-4">All-inclusive package</p>
                  {[
                    'Live Sessions',
                    'Interview Preparation',
                    'Resume Writing',
                    'Mock Interviews',
                    '1-1 Mentorship'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Support Session */}
            <Card className="bg-slate-800/50 border-slate-600 backdrop-blur-sm relative hover:transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Support Session</h3>
                  <div className="text-4xl font-bold text-purple-400 mb-2">Get Price</div>
                  <p className="text-gray-300">Customized Support</p>
                </div>

                <Button 
                  onClick={() =>
                document.getElementById("enrollment-section")?.scrollIntoView({ behavior: "smooth" })
                }
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 mb-6">
                  Book A Slot
                </Button>

                <div className="space-y-4">
                  <p className="text-gray-300 mb-4">Support Session On</p>
                  {[
                    'Assistance in Job',
                    'Assistance in Interview',
                    'Job Search Strategies and Tips',
                    'Mentorship',
                    'Mock Interviews'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Target className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-300 mb-4 text-lg font-semibold">All plans include 24/7 support and lifetime access to course materials</p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <span className="flex items-center"><CheckCircle className="w-4 h-4 text-green-400 mr-2" />Money Back Guarantee</span>
              <span className="flex items-center"><CheckCircle className="w-4 h-4 text-green-400 mr-2" />Flexible Payment Options</span>
              <span className="flex items-center"><CheckCircle className="w-4 h-4 text-green-400 mr-2" />Career Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="aboutus-section" className="py-24 px-4 bg-gradient-to-r from-slate-800/50 to-purple-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-6">About Us</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Transforming careers from non-IT backgrounds to high-demand IT professionals
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Mission & Books Section */}
            <div className="lg:col-span-2">
              <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-600 backdrop-blur-sm h-full">
                <h3 className="text-3xl font-bold text-white mb-6">Our Mission</h3>
                <div className="text-gray-300 text-lg leading-relaxed mb-8 space-y-4">
                  <p>We bridge the gap between non-IT backgrounds and high-demand IT careers.</p>
                  <p>Whether you're a <span className="text-pink-400 font-bold">housewife</span>, <span className="text-blue-400 font-bold">nurse</span>, or <span className="text-orange-400 font-bold">truck driver</span>, you can become an IT professional in just <span className="text-purple-400 font-bold">6 months</span>.</p>
                </div>
                
                {/* Books Section */}
                <div className="border-t border-slate-600 pt-6">
                  <h4 className="text-xl font-bold text-white mb-4">Published Java Resources</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <a 
                      href="https://www.amazon.com/Java-Revision-Notes-Color-Coded/dp/9357017798"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group bg-gradient-to-br from-slate-700/30 to-slate-800/30 hover:from-slate-600/40 hover:to-slate-700/40 rounded-xl p-4 transition-all duration-300 border border-slate-600/50 hover:border-orange-500/50 transform hover:scale-105"
                    >
                      <div className="flex items-start space-x-4">
                        <img 
                          src="https://customer-assets.emergentagent.com/job_sdet-sheet-connect/artifacts/dnvadr71_Java%20Revision%20Notes.jpg"
                          alt="Java Revision Notes"
                          className="w-16 h-20 object-cover rounded drop-shadow-lg flex-shrink-0"
                        />
                        <div className="flex-1">
                          <h5 className="text-orange-400 font-bold text-sm group-hover:text-orange-300 mb-1">Java Revision Notes</h5>
                          <p className="text-gray-400 text-xs mb-2">Color Coded Edition</p>
                          <p className="text-gray-300 text-xs leading-relaxed">Quick interview prep in hours, not weeks</p>
                        </div>
                      </div>
                    </a>
                    
                    <a 
                      href="https://www.amazon.com/Java-Coding-Programs-Chirag-Khimani/dp/936013662X"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group bg-gradient-to-br from-slate-700/30 to-slate-800/30 hover:from-slate-600/40 hover:to-slate-700/40 rounded-xl p-4 transition-all duration-300 border border-slate-600/50 hover:border-green-500/50 transform hover:scale-105"
                    >
                      <div className="flex items-start space-x-4">
                        <img 
                          src="https://customer-assets.emergentagent.com/job_sdet-sheet-connect/artifacts/wxafsi10_Java%20Coding%20Program.jpeg"
                          alt="Java Coding Programs"
                          className="w-16 h-20 object-cover rounded drop-shadow-lg flex-shrink-0"
                        />
                        <div className="flex-1">
                          <h5 className="text-green-400 font-bold text-sm group-hover:text-green-300 mb-1">Java Coding Programs</h5>
                          <p className="text-gray-400 text-xs mb-2">Color Coded Edition</p>
                          <p className="text-gray-300 text-xs leading-relaxed">Build problem-solving mindset</p>
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Author Profile Section */}
            <div>
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-600 backdrop-blur-sm text-center h-full flex flex-col justify-center">
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="w-40 h-40 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-1 shadow-2xl">
                      <img 
                        src="https://customer-assets.emergentagent.com/job_sdet-sheet-connect/artifacts/lzex97p7_Untitled%20design.png" 
                        alt="Chirag Khimani - SDET Trainer" 
                        className="w-full h-full rounded-full object-cover bg-white"
                      />
                    </div>
                  </div>
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Chirag Khimani</h4>
                <p className="text-blue-400 font-semibold mb-2 text-sm">SDET Trainer & QA Automation Consultant</p>
                <p className="text-gray-400 text-xs mb-4">Author • Mentor • Industry Expert</p>
                <p className="text-gray-300 text-sm">Years of hands-on experience in test automation, Java development, and mentoring students worldwide.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-2xl p-8 border border-slate-600 backdrop-blur-sm">
          <p
  className="text-center text-base md:text-lg leading-7 md:leading-8"
  style={{ color: 'rgb(255 255 255 / var(--tw-text-opacity, 1))' }}
>
  The program is led by <span class="text-blue-400 font-semibold">Chirag Khimani</span>, a seasoned SDET
  Trainer, QA Automation Consultant, and Author of two popular Java books: Java Revision Notes – Color Coded and
  Java Coding Programs – Color Coded. With years of hands-on experience in test automation, Java development, and
  mentoring students worldwide, Chirag combines deep technical expertise with a passion for teaching.
</p>

            <h3 className="text-3xl font-bold text-white mb-8 text-center mt-[40px]">What Sets Us Apart</h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Foundation Building",
                  description: "Start with Java and programming logic, even if you have zero prior coding experience.",
                  icon: BookOpen,
                  color: "from-blue-500 to-indigo-500"
                },
                {
                  title: "Industry-Ready Tools",
                  description: "Learn Selenium, Playwright, Appium, RestAssured, Cucumber, TestNG, Jenkins, GitHub, Docker, and more.",
                  icon: Code,
                  color: "from-purple-500 to-pink-500"
                },
                {
                  title: "Career Preparation",
                  description: "Resume building, LinkedIn optimization, mock interviews, and guidance to crack real job interviews.",
                  icon: Target,
                  color: "from-green-500 to-teal-500"
                },
                {
                  title: "Proven Results",
                  description: "Alumni have successfully transitioned to IT careers in the US, Canada, and India, securing high-paying automation roles.",
                  icon: Trophy,
                  color: "from-yellow-500 to-orange-500"
                }
              ].map((feature, index) => (
                <Card key={index} className="bg-slate-800/50 border-slate-600 hover:bg-slate-700/50 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center mx-auto mb-4`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-white font-bold text-lg mb-3">{feature.title}</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
       <section className="py-24 px-4 bg-[linear-gradient(to_bottom,_#0f172a,_#581c87,_#0f172a)]">

      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-5xl font-bold text-white mb-6">Success Stories</h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
          Hear from our graduates who have successfully transitioned into SDET
          roles at top companies
        </p>

        <div className="relative flex items-center justify-center">
          {/* Previous Button */}
          <button
            onClick={prevTestimonial}
            className="absolute left-0 z-10 bg-slate-700/70 hover:bg-slate-600/70 p-3 rounded-full text-white transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Slider Content */}
          <div className="overflow-hidden w-full max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-md shadow-lg">
                  <CardContent className="p-8">
                    <div className="flex flex-col items-center text-center">
                      <img
                        src={testimonials[index].image}
                        alt={testimonials[index].name}
                        className="w-16 h-16 rounded-full mb-4"
                      />
                      <h4 className="text-white font-semibold text-lg">
                        {testimonials[index].name}
                      </h4>
                      <p className="text-gray-400 text-sm mb-3">
                        {testimonials[index].role}
                      </p>
                      <div className="flex justify-center mb-4">
                        {[...Array(testimonials[index].rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 text-yellow-400 fill-current"
                          />
                        ))}
                      </div>
                      <p className="text-gray-300 text-base italic leading-relaxed max-w-2xl">
                        "{testimonials[index].comment}"
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Next Button */}
          <button
            onClick={nextTestimonial}
            className="absolute right-0 z-10 bg-slate-700/70 hover:bg-slate-600/70 p-3 rounded-full text-white transition"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </section>

      {/* Enrollment Section */}
            <section
  id="enrollment-section"
  className="py-24 px-4 bg-gradient-to-br from-slate-900/50 to-blue-900/30 min-h-screen flex items-center justify-center"
>
  <div className="max-w-5xl mx-auto w-full">
    {/* Header */}
    <div className="text-center mb-12">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4 shadow-2xl">
          <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <h2 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        Ready to Start Your SDET Journey?
      </h2>
      <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-6">
        Join thousands of successful graduates and transform your career in software testing and automation
      </p>
      <div className="flex justify-center space-x-6 text-base text-gray-400">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span>Free Consultation</span>
        </div>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span>Quick Response</span>
        </div>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span>Expert Guidance</span>
        </div>
      </div>
    </div>

    {/* Tabs */}
    <Tabs defaultValue="enrollment" className="w-full">
      <TabsList className="grid w-full h-auto grid-cols-2 bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-2xl p-2 backdrop-blur-md shadow-lg">
        <TabsTrigger
          value="enrollment"
          className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-4 px-6 text-lg font-semibold rounded-xl transition-all duration-300 hover:bg-slate-600/40 data-[state=active]:scale-[1.02]"
        >
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span className="text-[14px] sm:text-base">Course Enrollment</span>
          </div>
        </TabsTrigger>
        <TabsTrigger
          value="contact"
          className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-4 px-6 text-lg font-semibold rounded-xl transition-all duration-300 hover:bg-slate-600/40 data-[state=active]:scale-[1.02]"
        >
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Contact Us</span>
          </div>
        </TabsTrigger>
      </TabsList>

      {/* Enrollment Tab */}
      <TabsContent value="enrollment" >
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              transform:
                currentStep === "form"
                  ? "translateX(0)"
                  : currentStep === "payment"
                    ? "translateX(-100%)"
                    : currentStep === "razorpay"
                      ? "translateX(-200%)"
                      : "translateX(-300%)",
            }}
          >
            {/* Step 1: Form */}
            <div className="w-full flex-shrink-0">
              <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/60 border border-slate-600 backdrop-blur-sm shadow-2xl rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-1">
                  <div className="bg-slate-800/80 rounded-3xl">
                    <div className="pb-6 pt-8 px-8 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-3 shadow-lg">
                        <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.3-1.54c-.3-.36-.77-.36-1.07 0-.3.36-.3.95 0 1.31l1.83 2.17c.3.36.77.36 1.07 0l3.29-4.04c.3-.36.3-.95 0-1.31-.3-.36-.77-.36-1.07 0z" />
                        </svg>
                      </div>
                      <h3 className="text-3xl text-white mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-bold">
                        Course Enrollment Form
                      </h3>
                      <p className="text-gray-300 text-lg leading-relaxed">
                        Fill out the form below and our expert team will contact you within 24 hours to guide you
                        through your SDET journey
                      </p>
                    </div>

                    {submitStatus && (
                      <div
                        className={`mx-8 mb-6 p-4 rounded-lg border ${submitStatus.type === "success" ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"}`}
                      >
                        <p className={submitStatus.type === "success" ? "text-green-300" : "text-red-300"}>
                          {submitStatus.message}
                        </p>
                      </div>
                    )}

                    <div className="px-8 pb-8">
                      <form ref={enrollmentFormRef} onSubmit={handleEnrollmentSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label htmlFor="name" className="text-white text-base font-semibold flex items-center">
                              <svg className="h-4 w-4 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                              </svg>
                              Full Name *
                            </label>
                            <input
                              id="name"
                              type="text"
                              value={enrollmentForm.name}
                              onChange={(e) =>
                                handleInputChange(enrollmentForm, setEnrollmentForm)("name")(e.target.value)
                              }
                              required
                              className="w-full bg-slate-700/80 border border-slate-500 text-white h-12 text-base rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 px-4"
                              placeholder="Enter your full name"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="email" className="text-white text-base font-semibold flex items-center">
                              <svg className="h-4 w-4 mr-2 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                              </svg>
                              Email Address *
                            </label>
                            <input
                              id="email"
                              type="email"
                              value={enrollmentForm.email}
                              onChange={(e) =>
                                handleInputChange(enrollmentForm, setEnrollmentForm)("email")(e.target.value)
                              }
                              required
                              className="w-full bg-slate-700/80 border border-slate-500 text-white h-12 text-base rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 px-4"
                              placeholder="Enter your email address"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label htmlFor="country" className="text-white text-base font-semibold flex items-center">
                              <svg className="h-4 w-4 mr-2 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                              </svg>
                              Country *
                            </label>
                            <input
                              id="country"
                              type="text"
                              value={enrollmentForm.country}
                              onChange={(e) =>
                                handleInputChange(enrollmentForm, setEnrollmentForm)("country")(e.target.value)
                              }
                              required
                              className="w-full bg-slate-700/80 border border-slate-500 text-white h-12 text-base rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 px-4"
                              placeholder="Enter your country"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="phone" className="text-white text-base font-semibold flex items-center">
                              <svg className="h-4 w-4 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.92 7.02C17.45 6.18 16.51 5.55 15.46 5.55c-1.05 0-1.99.63-2.46 1.47C12.97 5.77 12.25 5 11.5 5c-.75 0-1.47.77-1.46 1.47-.47-.84-1.41-1.47-2.46-1.47-1.05 0-1.99.63-2.46 1.47C4.56 5.55 3.62 6.18 3.15 7.02c-.48.84-.48 1.96 0 2.8zM7 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                              </svg>
                              Phone Number *
                            </label>
                            <input
                              id="phone"
                              type="tel"
                              value={enrollmentForm.phone_number}
                              onChange={(e) =>
                                handleInputChange(enrollmentForm, setEnrollmentForm)("phone_number")(e.target.value)
                              }
                              required
                              className="w-full bg-slate-700/80 border border-slate-500 text-white h-12 text-base rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 px-4"
                              placeholder="+1 (555) 123-4567"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label
                              htmlFor="experience"
                              className="text-white text-base font-semibold flex items-center"
                            >
                              <svg className="h-4 w-4 mr-2 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                              Experience Level *
                            </label>
                            <select
                              value={enrollmentForm.experience_level}
                              onChange={(e) =>
                                handleInputChange(enrollmentForm, setEnrollmentForm)("experience_level")(e.target.value)
                              }
                              required
                              className="w-full bg-slate-700/80 border border-slate-500 text-white h-12 text-base rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 px-4"
                            >
                              <option value="">Select your experience level</option>
                              <option value="Beginner">Beginner (No Experience)</option>
                              <option value="Intermediate">Intermediate (Some Experience)</option>
                              <option value="Advanced">Advanced (Experienced)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="course" className="text-white text-base font-semibold flex items-center">
                              <svg className="h-4 w-4 mr-2 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.3-1.54c-.3-.36-.77-.36-1.07 0-.3.36-.3.95 0 1.31l1.83 2.17c.3.36.77.36 1.07 0l3.29-4.04c.3-.36.3-.95 0-1.31-.3-.36-.77-.36-1.07 0z" />
                              </svg>
                              Course Program *
                            </label>
                            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-1 rounded-lg">
                              <input
                                id="course"
                                type="text"
                                value="SDET Bootcamp Program"
                                readOnly
                                className="w-full bg-slate-700/80 border border-slate-500 text-white cursor-not-allowed h-12 text-base rounded-lg px-4"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-4">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-4 text-lg font-bold rounded-lg shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                                Submitting Your Application...
                              </>
                            ) : (
                              <>
                                <svg className="h-6 w-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                                Submit My Enrollment Application
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Payment Image */}
            <div className="w-full flex-shrink-0">
              <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/60 border border-slate-600 backdrop-blur-sm shadow-2xl rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-1">
                  <div className="bg-slate-800/80 rounded-3xl">
                    <div className="pb-6 pt-8 px-8 text-center">
                      <h3 className="text-3xl text-white mb-3 font-bold">SDET Bootcamp Registration Fee</h3>
                      <p className="text-gray-300 text-lg leading-relaxed">
                        Seats fill up fast! Confirm your spot in the coming batch with a little one-time registration fee.
                      </p>
                    </div>

                    <div className="px-8 pb-8">
                      <div className="space-y-8">
                        {/* Limited Seats Badge */}
                        <div className="flex justify-center mt-6">
  <div className="relative inline-block rounded-full p-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 animate-border-rotate shadow-[0_0_10px_rgba(236,72,153,0.6)]">
    <div className="flex flex-col sm:flex-row items-center justify-center text-center gap-1 sm:gap-2 px-6 py-3 bg-slate-900 rounded-full text-purple-300 font-semibold ">
      {/* <svg
        className="h-5 w-5 text-purple-400 mr-1"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg> */}
      <span>⚡ Limited Seats Left – Enroll Before the Batch Closes!</span>
    </div>
  </div>
</div>


                        {/* Payment Info */}
                        <div className="bg-slate-700/50 rounded-2xl p-8 border border-slate-600">
                          <h4 className="text-2xl text-white font-bold mb-2">Complete Your Enrollment</h4>
                          <p className="text-gray-400 mb-6">Secure payment powered by Razorpay</p>

                          <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center text-gray-300 font-bold">
                              <span>Registration Fee (Fully Adjustable in Total Course Fee)</span>
                              <span className="text-xl font-bold text-white">$100</span>
                            </div>
                            <div className="border-t border-slate-600"></div>
                            <div className="flex justify-between items-center">
                             
                              
                            </div>
                          </div>

                          <button
                            onClick={handlePaymentClick}
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 text-lg font-bold rounded-lg shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                                Pay $100 Now
                              </>
                            )}
                          </button>

                          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-400">
                            <span>🔒 100% Secure Payment</span>
                            <span>⚡ Instant Confirmation</span>
                            <span>📩 Receipt via Email</span>
                          </div>
                          
                        </div>

                        <button
                          onClick={handleBackToForm}
                          className="w-full bg-slate-700/50 hover:bg-slate-700 text-gray-300 hover:text-white py-3 text-base font-semibold rounded-lg transition-all duration-300 border border-slate-600"
                        >
                          ← Back to Form
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Razorpay (Hidden - handled by Razorpay modal) */}
            <div className="w-full flex-shrink-0">
              <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/60 border border-slate-600 backdrop-blur-sm shadow-2xl rounded-3xl overflow-hidden p-8 text-center">
                <p className="text-gray-400">Processing payment...</p>
              </div>
            </div>

            {/* Step 4: Congratulations */}
            <div className="w-full flex-shrink-0">
              <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-600/50 backdrop-blur-sm shadow-2xl rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 p-1">
                  <div className="bg-slate-800/80 rounded-3xl">
                    <div className="py-16 px-8 text-center">
                      {/* Success Icon */}
                      <div className="flex justify-center mb-8">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-xl opacity-50"></div>
                          <div className="relative inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-2xl">
                            <svg className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <h2 className="text-5xl font-bold text-emerald-400 mb-4">Congratulations You're In!!</h2>
                      <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-8">
                        You've taken the first step towards starting your IT journey!
                      </p>

                      {/* Payment Success Badge */}
                      <div className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/50 rounded-full mb-12">
                        <svg className="h-6 w-6 text-emerald-400 mr-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        <span className="text-emerald-300 font-bold text-lg">Payment Successful</span>
                        <span className="ml-2 text-2xl">✨</span>
                      </div>

                      <div className="space-y-4 mb-12 text-gray-300">
                        <p className="text-lg">
                          A confirmation email has been sent to{" "}
                          <span className="text-white font-semibold">{enrollmentForm.email}</span>
                        </p>
                        <p className="text-base">
                          Our expert team will contact you within 24 hours to guide you through the next steps.
                        </p>
                      </div>

                      <button
                        onClick={handleNewEnrollment}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-4 text-lg font-bold rounded-lg shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center"
                      >
                        <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        New Enrollment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </TabsContent>

      {/* Contact Us Tab */}
      <TabsContent value="contact" >
        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-700/60 border-slate-600 backdrop-blur-sm shadow-2xl rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-1">
            <div className="bg-slate-800/80 rounded-3xl">
              <CardHeader className="pb-6 pt-8 px-8">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-3 shadow-lg">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-3xl text-white mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Contact Us
                  </CardTitle>
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    Have questions about our SDET program? Our expert team is here to help you make the right career decision
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name" className="text-white text-lg font-semibold flex items-center">
                        <Users className="h-5 w-5 mr-2 text-purple-400" />
                        Your Name *
                      </Label>
                      <Input
                        id="contact-name"
                        value={contactForm.name}
                        onChange={(e) => handleInputChange(contactForm, setContactForm)('name')(e.target.value)}
                        required
                        className="bg-slate-700/80 border-slate-500 text-white h-14 text-lg rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email" className="text-white text-lg font-semibold flex items-center">
                        <MessageCircle className="h-5 w-5 mr-2 text-pink-400" />
                        Email Address *
                      </Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => handleInputChange(contactForm, setContactForm)('email')(e.target.value)}
                        required
                        className="bg-slate-700/80 border-slate-500 text-white h-14 text-lg rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                        placeholder="Enter your email address"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-white text-lg font-semibold flex items-center">
                      <MessageCircle className="h-5 w-5 mr-2 text-yellow-400" />
                      Your Message *
                    </Label>
                    <Textarea
                      id="message"
                      value={contactForm.message}
                      onChange={(e) => handleInputChange(contactForm, setContactForm)('message')(e.target.value)}
                      required
                      rows={6}
                      className="bg-slate-700/80 border-slate-500 text-white text-lg rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 resize-none"
                      placeholder="Tell us about your questions, career goals, or any specific requirements you have for the SDET program..."
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-6 text-2xl font-bold rounded-xl shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                          Sending Your Message...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center text-[20px] sm:text-base">
                          <MessageCircle className="h-7 w-7 mr-3" />
                          Send My Message
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </div>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</section>

      {/* Floating WhatsApp Icon */}
      <a
        href="https://wa.link/vmiqhs"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 z-50"
        title="Contact us on WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>

      {/* Footer */}
      <footer className="py-16 px-4 bg-slate-900">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-sm text-gray-500">
            Copyright © 2025 Chirag Khimani | All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;