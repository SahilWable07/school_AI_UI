import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Building2, LogOut, Loader2 } from 'lucide-react';
import { useAuth, Client } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/loading-skeleton';

const API_BASE = 'https://platform-development-dev.157.20.214.214.nip.io/auth/api';

const ClientSelection = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { accessToken, user, selectClient, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      if (!accessToken) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/clients`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch clients');

        const data = await response.json();
        setClients(data.clients || []);
        setFilteredClients(data.clients || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load organizations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [accessToken, navigate]);

  useEffect(() => {
    const filtered = clients.filter(client => {
      const name = client.orgn_details[0]?.orgn_name?.toLowerCase() || '';
      const shortName = client.primary_info[0]?.short_name?.toLowerCase() || '';
      const query = search.toLowerCase();
      return name.includes(query) || shortName.includes(query);
    });
    setFilteredClients(filtered);
  }, [search, clients]);

  const handleClientSelect = (client: Client) => {
    selectClient(client);
    navigate('/chat');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 glass border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Select Organization</h1>
              <p className="text-xs text-muted-foreground">
                Welcome, {user?.first_name}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 text-base bg-card border-border/50 shadow-soft rounded-xl"
          />
        </motion.div>

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} className="bg-card border border-border/50" />
            ))}
          </div>
        )}

        {/* Client Grid */}
        {!isLoading && !error && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredClients.map((client) => {
              const details = client.orgn_details[0];
              const info = client.primary_info[0];
              
              return (
                <motion.button
                  key={client.id}
                  variants={itemVariants}
                  onClick={() => handleClientSelect(client)}
                  className="group text-left p-5 rounded-xl bg-card border border-border/50 shadow-soft hover-lift focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {details?.logo ? (
                        <img
                          src={details.logo}
                          alt={details.orgn_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <span className={`text-lg font-semibold text-muted-foreground ${details?.logo ? 'hidden' : ''}`}>
                        {info?.short_name?.charAt(0) || details?.orgn_name?.charAt(0) || '?'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {details?.orgn_name || 'Unknown Organization'}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {info?.short_name || details?.orgn_type}
                      </p>
                      {details?.address && (
                        <p className="text-xs text-muted-foreground/70 truncate mt-1">
                          {details.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Hover indicator */}
                  <div className="mt-4 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Open chat</span>
                    <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredClients.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {search ? 'No organizations match your search' : 'No organizations available'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientSelection;
