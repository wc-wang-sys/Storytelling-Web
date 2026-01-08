import React, { useState } from 'react';
import { User, UserRole, Language } from '../types';
import { Button } from '../components/Button';
import { QrCode, User as UserIcon, Lock, GraduationCap, School, Bug, Smile } from 'lucide-react';
import { translations } from '../locales';

interface LoginProps {
  onLogin: (user: User) => void;
  language: Language;
}

export const Login: React.FC<LoginProps> = ({ onLogin, language }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STUDENT);
  const [method, setMethod] = useState<'form' | 'qr'>('form');
  const [isRegistering, setIsRegistering] = useState(false);

  const t = translations[language].login;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      alert("Please enter username and password!");
      return;
    }

    if (isRegistering) {
      if (!fullName) {
        alert("Please enter your name!");
        return;
      }
      alert(`Account created for ${fullName}! Please log in.`);
      setIsRegistering(false);
      setPassword(''); 
      return;
    }
    
    onLogin({
      id: Date.now().toString(),
      name: username,
      role: selectedRole,
      points: 0,
      badges: []
    });
  };

  const handleQrLogin = () => {
     onLogin({
      id: Date.now().toString(),
      name: 'StudentQR',
      role: UserRole.STUDENT,
      points: 0,
      badges: []
    });
  }

  const roleOptions = [
    { role: UserRole.STUDENT, icon: <GraduationCap size={24} />, label: t.role_student, color: "bg-kid-blue border-blue-300" },
    { role: UserRole.TEACHER, icon: <School size={24} />, label: t.role_teacher, color: "bg-kid-green border-green-300" },
    { role: UserRole.TESTER, icon: <Bug size={24} />, label: t.role_tester, color: "bg-kid-pink border-pink-300" }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-kid-blue to-purple-200">
      <div className="bg-white p-6 md:p-8 rounded-[3rem] shadow-2xl max-w-lg w-full border-8 border-kid-yellow animate-fade-in">
        <h1 className="text-4xl font-extrabold text-center text-kid-purple mb-2">
          {t.title}
        </h1>
        <p className="text-center text-gray-500 font-bold mb-6">{t.subtitle}</p>

        <div className="bg-gray-100 p-1 rounded-2xl flex mb-6">
          <button 
            onClick={() => setMethod('form')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${method === 'form' ? 'bg-white text-kid-blue shadow-sm' : 'text-gray-400'}`}
          >
            {t.method_pass}
          </button>
          <button 
            onClick={() => setMethod('qr')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${method === 'qr' ? 'bg-white text-kid-blue shadow-sm' : 'text-gray-400'}`}
          >
            {t.method_qr}
          </button>
        </div>

        {method === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              {roleOptions.map((opt) => (
                <button
                  key={opt.role}
                  type="button"
                  onClick={() => setSelectedRole(opt.role)}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all ${
                    selectedRole === opt.role 
                      ? `${opt.color} text-white shadow-md scale-105 border-transparent` 
                      : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {opt.icon}
                  <span className="text-xs font-bold mt-1">{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              
              {isRegistering && (
                <div className="relative animate-slide-up">
                  <Smile className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-4 border-gray-200 focus:border-kid-pink outline-none placeholder-gray-400 font-bold text-gray-700"
                    placeholder={t.name}
                  />
                </div>
              )}

              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-4 border-gray-200 focus:border-kid-pink outline-none placeholder-gray-400 font-bold text-gray-700"
                  placeholder={t.username}
                />
              </div>
              
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-4 border-gray-200 focus:border-kid-pink outline-none placeholder-gray-400 font-bold text-gray-700"
                  placeholder={t.password}
                />
              </div>
            </div>

            <Button type="submit" size="xl" variant="primary" className="w-full mt-6 bg-kid-blue hover:bg-blue-400 border-none shadow-blue-200">
              {isRegistering ? t.btn_signup : t.btn_login}
            </Button>

            <div className="text-center pt-4">
              <button 
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-kid-purple font-bold text-lg"
              >
                {isRegistering ? t.switch_login : t.switch_signup}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="bg-gray-200 w-48 h-48 mx-auto rounded-xl flex items-center justify-center mb-6 border-4 border-dashed border-gray-400">
              <div className="space-y-2">
                <QrCode size={48} className="mx-auto text-gray-400" />
                <span className="text-gray-400 font-bold block">{t.method_qr}</span>
              </div>
            </div>
            <p className="text-lg text-gray-600 mb-6">{t.scan_hint}</p>
            <Button type="button" onClick={handleQrLogin} size="lg" className="mx-auto">
              {t.simulate}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};