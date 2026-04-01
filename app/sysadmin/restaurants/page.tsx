'use client';

import { useState, useEffect } from 'react';
import {
    Building2,
    Mail,
    Phone,
    MapPin,
    Plus,
    ChevronRight,
    AlertCircle,
    Check,
    Clock,
    AlertTriangle,
    Eye,
    EyeOff,
    Loader,
    ChefHat,
    Smartphone,
    CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Restaurant {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    airpay_account_id?: string;
    payment_status: 'pending' | 'active' | 'failed';
    created_at: string;
    logo_url?: string;
    customer_portal_url?: string;
    clickpesa_mobile_number?: string;
    bank_account_number?: string;
    bank_name?: string;
    account_holder_name?: string;
}

export default function RestaurantsPage() {
    const router = useRouter();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        admin_email: '',
        admin_password: '',
        admin_pin: '',
        logo_url: '',
        clickpesa_mobile_number: '',
        bank_account_number: '',
        bank_name: '',
        account_holder_name: ''
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');

    const fetchRestaurants = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/restaurants`);
            if (res.ok) {
                const data = await res.json();
                setRestaurants(data);
            }
        } catch (err) {
            toast.error('Failed to load restaurants');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRestaurants();
        // Refresh every 10 seconds to check Airpay account creation status
        const interval = setInterval(fetchRestaurants, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setLogoFile(null);
            setLogoPreview('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch(`${BASE_URL}/api/restaurants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const newRestaurant = await res.json();
                
                // If a logo file was selected, upload it separately
                if (logoFile) {
                    const logoData = new FormData();
                    logoData.append('logo', logoFile);
                    
                    try {
                        const logoRes = await fetch(`${BASE_URL}/api/restaurants/${newRestaurant.id}/logo`, {
                            method: 'PATCH',
                            body: logoData
                        });
                        
                        if (logoRes.ok) {
                            const updatedRest = await logoRes.json();
                            newRestaurant.logo_url = updatedRest.logo_url;
                        }
                    } catch (err) {
                        console.error('Logo upload error:', err);
                        toast.error('Restaurant created, but logo upload failed.');
                    }
                }

                setRestaurants(prev => {
                    // Check if already in list to avoid duplicates from interval refresh
                    if (prev.some(r => r.id === newRestaurant.id)) return prev;
                    return [newRestaurant, ...prev];
                });
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    address: '',
                    admin_email: '',
                    admin_password: '',
                    admin_pin: '',
                    logo_url: '',
                    clickpesa_mobile_number: '',
                    bank_account_number: '',
                    bank_name: '',
                    account_holder_name: ''
                });
                setLogoFile(null);
                setLogoPreview('');
                setShowForm(false);
                toast.success('Restaurant created! Airpay account setup in progress...');
            } else {
                const error = await res.json();
                const errorMsg = Array.isArray(error.detail)
                    ? error.detail.map((e: any) => `${e.loc?.join('.') || 'Error'}: ${e.msg}`).join(', ')
                    : (error.detail || 'Failed to create restaurant');
                toast.error(errorMsg);
            }
        } catch (err) {
            toast.error('Error creating restaurant');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Active</span>
                    </div>
                );
            case 'pending':
                return (
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 px-4 py-2 rounded-full border border-amber-200 dark:border-amber-800/50">
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Setting up...</span>
                    </div>
                );
            case 'failed':
                return (
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 px-4 py-2 rounded-full border border-red-200 dark:border-red-800/50">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">Failed</span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-full bg-gray-50/50 dark:bg-transparent p-10">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white mb-3">
                            Restaurant <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Management</span>
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">Manage and provision restaurant organizations with Airpay payment integration</p>
                    </div>
                    
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="group flex items-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-black px-8 py-4 rounded-[28px] font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10"
                    >
                        <Plus className="w-5 h-5" />
                        New Restaurant
                    </button>
                </div>

                {/* Create Restaurant Form */}
                {showForm && (
                    <div className="bg-white dark:bg-[#1C1C1E] p-10 rounded-[40px] border border-black/5 dark:border-white/5 shadow-sm">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-8">Register New Restaurant</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Restaurant Information */}
                            <div className="space-y-6">
                                <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Restaurant Details</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Restaurant Name *
                                        </label>
                                        <div className="relative">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="e.g., The Italian Restaurant"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Email Address *
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="contact@restaurant.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Phone Number *
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="+256 700 123456"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Address
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Kampala, Uganda"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Admin Account */}
                            <div className="space-y-6 pt-8 border-t border-black/5 dark:border-white/5">
                                <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Admin Account</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Admin Email *
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="email"
                                                name="admin_email"
                                                value={formData.admin_email}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="admin@restaurant.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Admin Password *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.admin_password ? 'text' : 'password'}
                                                name="admin_password"
                                                value={formData.admin_password}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords(prev => ({ ...prev, admin_password: !prev.admin_password }))}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPasswords.admin_password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Admin PIN *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.admin_pin ? 'text' : 'password'}
                                                name="admin_pin"
                                                value={formData.admin_pin}
                                                onChange={handleInputChange}
                                                required
                                                maxLength={6}
                                                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="000000"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords(prev => ({ ...prev, admin_pin: !prev.admin_pin }))}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPasswords.admin_pin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-6 pt-8 border-t border-black/5 dark:border-white/5">
                                <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Payment Method</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Add payment details where the organization will receive payments (mobile money or bank account)</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Mobile Money Number
                                        </label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="tel"
                                                name="clickpesa_mobile_number"
                                                value={formData.clickpesa_mobile_number}
                                                onChange={handleInputChange}
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="+256 700 123456"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                            For mobile money payments (ClickPesa, MTN, Airtel, etc.)
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Bank Account Number
                                        </label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                name="bank_account_number"
                                                value={formData.bank_account_number}
                                                onChange={handleInputChange}
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="1234567890"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                            Bank account for receiving payments
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Bank Name
                                        </label>
                                        <input
                                            type="text"
                                            name="bank_name"
                                            value={formData.bank_name}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="e.g., Standard Bank"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Account Holder Name
                                        </label>
                                        <input
                                            type="text"
                                            name="account_holder_name"
                                            value={formData.account_holder_name}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Organization name"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Branding */}
                            <div className="space-y-6 pt-8 border-t border-black/5 dark:border-white/5">
                                <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Branding</h3>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Restaurant Logo
                                    </label>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                        Upload the restaurant logo image (used in customer portal)
                                    </p>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            name="logo"
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    {(logoPreview || formData.logo_url) && (
                                        <div className="mt-3 p-3 bg-gray-50 dark:bg-black/20 rounded-[12px] border border-black/5 dark:border-white/5">
                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
                                            <img
                                                src={logoPreview || (formData.logo_url.startsWith('/') ? `${BASE_URL}${formData.logo_url}` : formData.logo_url)}
                                                alt="Logo preview"
                                                className="h-12 object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '';
                                                    (e.target as HTMLImageElement).className += ' hidden';
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Airpay Info */}
                            <div className="space-y-4 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[24px] border border-indigo-200 dark:border-indigo-800/50">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Airpay Integration</p>
                                        <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">
                                            When you create this restaurant, an Airpay sub-account will be automatically provisioned. You can monitor the setup status below.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 justify-end pt-8 border-t border-black/5 dark:border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-8 py-3 bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white rounded-[16px] font-bold transition-all hover:bg-gray-300 dark:hover:bg-white/20"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-[16px] font-bold transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {submitting && <Loader className="w-4 h-4 animate-spin" />}
                                    {submitting ? 'Creating...' : 'Create Restaurant'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Restaurants List */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Active Restaurants</h2>
                    
                    {loading ? (
                        <div className="text-center py-12">
                            <Loader className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">Loading restaurants...</p>
                        </div>
                    ) : restaurants.length === 0 ? (
                        <div className="bg-white dark:bg-[#1C1C1E] p-12 rounded-[40px] border border-black/5 dark:border-white/5 text-center">
                            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400 font-medium">No restaurants yet. Create one to get started.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {restaurants.map(restaurant => (
                                <div
                                    key={restaurant.id}
                                    onClick={() => router.push(`/admin`)}
                                    className="group bg-white dark:bg-[#1C1C1E] p-8 rounded-[32px] border border-black/5 dark:border-white/5 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer"
                                >
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-12 h-12 bg-white dark:bg-black rounded-xl border border-black/5 dark:border-white/5 overflow-hidden flex items-center justify-center shadow-sm">
                                                    {restaurant.logo_url ? (
                                                        <img
                                                            src={restaurant.logo_url.startsWith('/') ? `${BASE_URL}${restaurant.logo_url}` : restaurant.logo_url}
                                                            alt={restaurant.name}
                                                            className="w-full h-full object-contain p-1"
                                                        />
                                                    ) : (
                                                        <ChefHat className="w-6 h-6 text-indigo-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                                        {restaurant.name}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">ID: {restaurant.id.slice(0, 8)}...</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                                {restaurant.email && (
                                                    <div className="text-sm">
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">EMAIL</p>
                                                        <p className="text-gray-900 dark:text-white font-medium truncate">{restaurant.email}</p>
                                                    </div>
                                                )}

                                                {restaurant.phone && (
                                                    <div className="text-sm">
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">PHONE</p>
                                                        <p className="text-gray-900 dark:text-white font-medium">{restaurant.phone}</p>
                                                    </div>
                                                )}

                                                {(restaurant.clickpesa_mobile_number || restaurant.bank_account_number) && (
                                                    <div className="text-sm">
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">PAYMENT METHOD</p>
                                                        <div className="space-y-1">
                                                            {restaurant.clickpesa_mobile_number && (
                                                                <p className="text-gray-900 dark:text-white font-medium text-xs">{restaurant.clickpesa_mobile_number}</p>
                                                            )}
                                                            {restaurant.bank_account_number && (
                                                                <p className="text-gray-900 dark:text-white font-medium text-xs">{restaurant.bank_name || 'Bank'}: {restaurant.bank_account_number}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="text-sm">
                                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">STATUS</p>
                                                    {getStatusBadge(restaurant.payment_status)}
                                                </div>

                                                {restaurant.airpay_account_id && (
                                                    <div className="text-sm">
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">AIRPAY</p>
                                                        <p className="text-gray-900 dark:text-white font-mono text-xs truncate">{restaurant.airpay_account_id.slice(0, 12)}...</p>
                                                    </div>
                                                )}

                                                {restaurant.customer_portal_url && (
                                                    <div className="text-sm">
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">PORTAL URL</p>
                                                        <p className="text-indigo-600 dark:text-indigo-400 font-medium truncate">
                                                            /{restaurant.customer_portal_url}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CREATED</p>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                    {new Date(restaurant.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-6 h-6 text-gray-400 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
