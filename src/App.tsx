/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ArrowLeft, 
  Brain, 
  CheckCircle2, 
  AlertCircle,
  Trophy,
  RefreshCw,
  XCircle,
  Upload,
  FileText,
  X,
  Minus
} from 'lucide-react';
import { Subject, StudyDay, QuizQuestion, generateQuiz } from './services/geminiService';

type Page = 'home' | 'input' | 'result' | 'quiz' | 'score';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [subjects, setSubjects] = useState<Subject[]>([{ id: '1', name: '', units: 1 }]);
  const [examDate, setExamDate] = useState<string>('');
  const [studyHours, setStudyHours] = useState<number>(4);
  const [studyPlan, setStudyPlan] = useState<StudyDay[]>([]);
  const [currentQuizDay, setCurrentQuizDay] = useState<StudyDay | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; data: string; mimeType: string } | null>(null);

  // --- Logic ---
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const data = base64.split(',')[1];
      setUploadedFile({
        name: file.name,
        data,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const addSubject = () => {
    setSubjects([...subjects, { id: Math.random().toString(36).substr(2, 9), name: '', units: 1 }]);
  };

  const removeSubject = (id: string) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter(s => s.id !== id));
    }
  };

  const updateSubject = (id: string, field: keyof Subject, value: string | number) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const generatePlan = () => {
    if (!examDate) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate);
    exam.setHours(0, 0, 0, 0);
    
    const diffTime = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return;

    const plan: StudyDay[] = [];
    const studyDaysCount = Math.max(0, diffDays - 2); // Reserve last 2 days for revision
    
    // Flatten units
    const allUnits: { subject: string; unit: number }[] = [];
    subjects.forEach(s => {
      for (let i = 1; i <= s.units; i++) {
        allUnits.push({ subject: s.name, unit: i });
      }
    });

    const unitsPerDay = Math.ceil(allUnits.length / (studyDaysCount || 1));
    
    let unitIndex = 0;
    for (let i = 0; i < diffDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const isRevision = i >= studyDaysCount;
      const dayUnits: number[] = [];
      let daySubject = "";

      if (!isRevision && unitIndex < allUnits.length) {
        daySubject = allUnits[unitIndex].subject;
        for (let j = 0; j < unitsPerDay && unitIndex < allUnits.length; j++) {
          if (allUnits[unitIndex].subject === daySubject) {
            dayUnits.push(allUnits[unitIndex].unit);
            unitIndex++;
          } else {
            break; // Don't mix subjects in one day for simplicity
          }
        }
      }

      plan.push({
        dayNumber: i + 1,
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        subject: isRevision ? "Revision" : (daySubject || "Buffer Day"),
        units: dayUnits,
        isRevision
      });
    }

    setStudyPlan(plan);
    setPage('result');
  };

  const startQuiz = (day?: StudyDay) => {
    setCurrentQuizDay(day || null);
    setPage('quiz');
    setQuizQuestions([]);
    setUserAnswers([]);
    setQuizScore(null);
    setUploadedFile(null);
  };

  const submitQuiz = () => {
    let score = 0;
    quizQuestions.forEach((q, i) => {
      if (userAnswers[i] === q.correctAnswer) score++;
    });
    setQuizScore({ score, total: quizQuestions.length });
    setPage('score');
  };

  // --- Components ---

  return (
    <div className="min-h-screen bg-gradient-mesh relative overflow-hidden">
      {/* Animated Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>

      <nav className="relative z-10 p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPage('home')}>
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Brain className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            ExamStrategy AI
          </span>
        </div>
      </nav>

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {page === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl mx-auto px-4 py-8"
            >
              <div className="text-center space-y-8 py-12">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-block p-4 bg-white/50 backdrop-blur-md rounded-3xl border border-white/30 shadow-2xl mb-4"
                >
                  <Brain className="w-20 h-20 text-indigo-600" />
                </motion.div>
                <div className="space-y-4">
                  <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
                    Master Your Exams with <br />
                    <span className="text-indigo-600">AI Precision</span>
                  </h1>
                  <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                    Generate personalized study plans, daily tasks, and AI-powered quizzes to ensure you're fully prepared for the big day.
                  </p>
                </div>
                <button 
                  onClick={() => setPage('input')}
                  className="btn-primary text-lg px-10 py-4 group"
                >
                  Create Study Plan
                  <ChevronRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {page === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl mx-auto px-4 py-8"
            >
              <div className="glass-card p-8 space-y-8">
                <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setPage('home')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-3xl font-bold">Plan Your Strategy</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Subjects & Units</label>
                    {subjects.map((subject, index) => (
                      <div key={subject.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <input
                          type="text"
                          placeholder="Subject Name (e.g. Mathematics)"
                          value={subject.name}
                          onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                          className="glass-input flex-1 p-3 w-full"
                        />
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <div className="flex items-center bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl overflow-hidden">
                            <button 
                              onClick={() => updateSubject(subject.id, 'units', Math.max(1, subject.units - 1))}
                              className="p-3 hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              placeholder="Units"
                              value={subject.units}
                              onChange={(e) => updateSubject(subject.id, 'units', parseInt(e.target.value) || 1)}
                              className="w-12 text-center bg-transparent border-none focus:ring-0 p-0 font-bold"
                            />
                            <button 
                              onClick={() => updateSubject(subject.id, 'units', subject.units + 1)}
                              className="p-3 hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-slate-500 text-sm">Units</span>
                          <button 
                            onClick={() => removeSubject(subject.id)}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={addSubject}
                      className="flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" /> Add Subject
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Exam Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                        <input
                          type="date"
                          value={examDate}
                          onChange={(e) => setExamDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="glass-input w-full p-3 pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Study Hours / Day</label>
                      <div className="flex items-center bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl overflow-hidden h-[50px]">
                        <div className="pl-3 flex items-center text-slate-400">
                          <Clock className="w-5 h-5" />
                        </div>
                        <button 
                          onClick={() => setStudyHours(Math.max(1, studyHours - 1))}
                          className="p-3 hover:bg-slate-100 text-slate-600 transition-colors h-full"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={studyHours}
                          onChange={(e) => setStudyHours(parseInt(e.target.value) || 1)}
                          className="flex-1 text-center bg-transparent border-none focus:ring-0 p-0 font-bold"
                        />
                        <button 
                          onClick={() => setStudyHours(Math.min(24, studyHours + 1))}
                          className="p-3 hover:bg-slate-100 text-slate-600 transition-colors h-full"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={generatePlan}
                      disabled={subjects.some(s => !s.name) || !examDate}
                      className="btn-primary w-full"
                    >
                      Generate My Plan
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {page === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl mx-auto px-4 py-8"
            >
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setPage('input')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-3xl font-bold">Your Study Plan</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => startQuiz()}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Brain className="w-4 h-4" /> Take AI Quiz
                    </button>
                    <button onClick={() => setPage('input')} className="btn-secondary flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Regenerate
                    </button>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Days Left', value: studyPlan.length, icon: Calendar, color: 'text-blue-600' },
                    { label: 'Subjects', value: subjects.length, icon: BookOpen, color: 'text-indigo-600' },
                    { label: 'Daily Hours', value: studyHours, icon: Clock, color: 'text-purple-600' },
                    { label: 'Total Units', value: subjects.reduce((acc, s) => acc + s.units, 0), icon: CheckCircle2, color: 'text-emerald-600' },
                  ].map((stat, i) => (
                    <div key={i} className="glass-card p-4 flex flex-col items-center text-center">
                      <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
                      <span className="text-2xl font-bold">{stat.value}</span>
                      <span className="text-xs text-slate-500 uppercase font-semibold">{stat.label}</span>
                    </div>
                  ))}
                </div>

                {/* High Priority Alert */}
                {subjects.reduce((acc, s) => acc + s.units, 0) > studyPlan.length * 2 && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-amber-600 w-6 h-6 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-800">High Intensity Alert</h4>
                      <p className="text-sm text-amber-700">You have a lot of units to cover in a short time. Consider increasing daily study hours or focusing on core concepts.</p>
                    </div>
                  </div>
                )}

                {/* Plan Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {studyPlan.map((day) => (
                    <motion.div
                      key={day.dayNumber}
                      whileHover={{ y: -5 }}
                      className={`glass-card p-6 relative overflow-hidden ${day.isRevision ? 'border-indigo-200 bg-indigo-50/50' : ''}`}
                    >
                      {day.isRevision && (
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                          Revision
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-indigo-600 font-bold text-sm uppercase tracking-wider">Day {day.dayNumber}</span>
                          <h3 className="text-xl font-bold text-slate-800">{day.date}</h3>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-slate-400" />
                          <span className="font-semibold">{day.subject}</span>
                        </div>
                        
                        {day.units.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {day.units.map(u => (
                              <span key={u} className="px-3 py-1 bg-white/50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
                                Unit {u}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-sm text-slate-500 italic">
                          {day.isRevision 
                            ? "Focus on summarizing key concepts and solving past papers." 
                            : day.subject === "Buffer Day" 
                            ? "Use this day to catch up on any missed units."
                            : `Complete all units assigned for ${day.subject} today.`}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {page === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl mx-auto px-4 py-8"
            >
              <div className="glass-card p-8 space-y-8">
                <div className="flex items-center gap-4">
                  <button onClick={() => setPage('result')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div>
                    <h2 className="text-3xl font-bold">AI Quiz Generator</h2>
                    <p className="text-slate-500">
                      {currentQuizDay 
                        ? `Day ${currentQuizDay.dayNumber} • ${currentQuizDay.subject}`
                        : "General Study Review"}
                    </p>
                  </div>
                </div>

                {quizQuestions.length === 0 ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Option 1: Paste Study Material</label>
                        <textarea
                          placeholder="Paste your study notes, unit content, or key points here."
                          className="glass-input w-full p-4 min-h-[150px] resize-none"
                          id="quiz-content"
                        />
                      </div>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm font-medium leading-6">
                          <span className="bg-white px-4 text-slate-400 uppercase tracking-widest text-[10px]">OR</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Option 2: Upload File (PDF, Text)</label>
                        <div className="flex flex-col items-center justify-center w-full">
                          {uploadedFile ? (
                            <div className="w-full p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="text-indigo-600 w-6 h-6" />
                                <span className="font-medium text-indigo-900">{uploadedFile.name}</span>
                              </div>
                              <button 
                                onClick={() => setUploadedFile(null)}
                                className="p-1 hover:bg-indigo-100 rounded-full transition-colors"
                              >
                                <X className="w-5 h-5 text-indigo-600" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                                <p className="text-xs text-slate-400 mt-1">PDF, TXT, DOCX (Max 10MB)</p>
                              </div>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept=".pdf,.txt,.doc,.docx" 
                                onChange={handleFileUpload}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        const content = (document.getElementById('quiz-content') as HTMLTextAreaElement).value;
                        if (!content && !uploadedFile) {
                          alert("Please provide study material either by pasting text or uploading a file.");
                          return;
                        }
                        
                        setQuizLoading(true);
                        const fileData = uploadedFile ? { data: uploadedFile.data, mimeType: uploadedFile.mimeType } : undefined;
                        
                        generateQuiz(content, fileData)
                          .then(questions => {
                            setQuizQuestions(questions);
                          })
                          .catch(error => {
                            alert("Failed to generate quiz. Please try again.");
                          })
                          .finally(() => {
                            setQuizLoading(false);
                          });
                      }}
                      disabled={quizLoading}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {quizLoading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Generating Quiz...
                        </>
                      ) : (
                        <>
                          <Brain className="w-5 h-5" />
                          Generate 10 Questions
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {quizQuestions.map((q, qIndex) => (
                      <div key={qIndex} className="space-y-4 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <h4 className="text-lg font-bold text-slate-800">
                          <span className="text-indigo-600 mr-2">{qIndex + 1}.</span>
                          {q.question}
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          {q.options.map((option, oIndex) => (
                            <button
                              key={oIndex}
                              onClick={() => {
                                const newAnswers = [...userAnswers];
                                newAnswers[qIndex] = oIndex;
                                setUserAnswers(newAnswers);
                              }}
                              className={`p-4 text-left rounded-xl border transition-all ${
                                userAnswers[qIndex] === oIndex
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                              }`}
                            >
                              <span className="inline-block w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold text-center leading-6 mr-3">
                                {String.fromCharCode(65 + oIndex)}
                              </span>
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={submitQuiz}
                      disabled={userAnswers.length < quizQuestions.length || userAnswers.includes(undefined as any)}
                      className="btn-primary w-full"
                    >
                      Submit Quiz
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {page === 'score' && quizScore && (
            <motion.div
              key="score"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl mx-auto px-4 py-8"
            >
              <div className="space-y-8">
                <div className="glass-card p-12 text-center space-y-6">
                  <div className="inline-block p-6 bg-indigo-50 rounded-full mb-4">
                    <Trophy className="w-16 h-16 text-indigo-600" />
                  </div>
                  <h2 className="text-4xl font-extrabold">Quiz Completed!</h2>
                  <div className="flex justify-center items-baseline gap-2">
                    <span className="text-6xl font-black text-indigo-600">{quizScore.score}</span>
                    <span className="text-2xl text-slate-400 font-bold">/ {quizScore.total}</span>
                  </div>
                  <p className="text-xl text-slate-600">
                    {quizScore.score === quizScore.total ? "Perfect score! You're a master of this topic." : 
                     quizScore.score >= quizScore.total * 0.7 ? "Great job! You have a solid understanding." : 
                     "Good effort! A bit more review will help you master this."}
                  </p>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 inline-block">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Focus Area</p>
                    <p className="font-bold text-slate-800">
                      {currentQuizDay 
                        ? `${currentQuizDay.subject} • ${currentQuizDay.units.length ? `Units ${currentQuizDay.units.join(', ')}` : 'General Review'}`
                        : 'General Study Review'}
                    </p>
                  </div>

                  <div className="flex gap-4 justify-center pt-4">
                    <button onClick={() => setPage('result')} className="btn-primary">
                      Back to Plan
                    </button>
                    <button onClick={() => setPage('quiz')} className="btn-secondary">
                      Retake Quiz
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Brain className="text-indigo-600" /> Analysis & Corrections
                  </h3>
                  {quizQuestions.map((q, i) => (
                    <div key={i} className={`glass-card p-6 border-l-4 ${userAnswers[i] === q.correctAnswer ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <h4 className="font-bold text-slate-800">{i + 1}. {q.question}</h4>
                        {userAnswers[i] === q.correctAnswer ? (
                          <CheckCircle2 className="text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="text-red-500 shrink-0" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-widest block mb-1">Your Answer</span>
                          <span className={`${userAnswers[i] === q.correctAnswer ? 'text-emerald-600' : 'text-red-600'} font-medium`}>
                            {q.options[userAnswers[i]]}
                          </span>
                        </p>
                        {userAnswers[i] !== q.correctAnswer && (
                          <p className="text-sm">
                            <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-widest block mb-1">Correct Answer</span>
                            <span className="text-emerald-600 font-medium">
                              {q.options[q.correctAnswer]}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 py-12 text-center text-slate-400 text-sm">
      </footer>
    </div>
  );
}
