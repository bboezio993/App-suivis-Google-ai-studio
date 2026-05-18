import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { DataSource } from '../types';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Link2Off, RefreshCw, AlertCircle } from 'lucide-react';

export function Connections() {
  const connections = useStore(state => state.connections);
  const updateConnection = useStore(state => state.updateConnection);

  const handleConnect = (source: DataSource) => {
    // Simulate OAuth flow
    updateConnection(source, 'syncing');
    setTimeout(() => {
      updateConnection(source, 'connected');
    }, 2000);
  };

  const handleDisconnect = (source: DataSource) => {
    updateConnection(source, 'disconnected');
  };

  return (
    <div className="flex-1 overflow-auto p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Sources de Données</h2>
        <p className="text-muted-foreground">
          Connectez vos appareils et applications pour enrichir l'analyse d'Aura Elite. 
          Plus nous avons de données, plus nos recommandations seront précises.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(connections).map((conn) => (
          <div key={conn.source} className="bento-card justify-start gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-xl font-bold">
                  {conn.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{conn.name}</h3>
                  <p className="text-sm text-muted-foreground">{conn.description}</p>
                </div>
              </div>
              <Badge variant={conn.status === 'connected' ? 'default' : 'secondary'} className={
                conn.status === 'connected' ? 'bg-[#34C759]/10 text-[#34C759] hover:bg-[#34C759]/20 border-none' : ''
              }>
                {conn.status === 'connected' ? 'Connecté' : 
                 conn.status === 'syncing' ? 'Synchronisation...' : 'Déconnecté'}
              </Badge>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {conn.status === 'connected' && conn.lastSync ? (
                  <span className="flex items-center gap-1">
                    <RefreshCw size={12} />
                    Dernière sync: {new Date(conn.lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle size={12} />
                    Aucune donnée récente
                  </span>
                )}
              </div>
              
              {conn.source !== 'manual' && (
                conn.source === 'garmin' ? (
                  <Button 
                    nativeButton={false}
                    render={<Link to="/connections/garmin" />}
                    variant={conn.status === 'connected' ? 'outline' : 'default'}
                    size="sm"
                    className={conn.status !== 'connected' ? 'bg-[#0071E3] text-white hover:bg-[#0071E3]/90' : ''}
                  >
                    {conn.status === 'connected' ? (
                      <>Gérer les imports</>
                    ) : (
                      <><Link2 size={14} className="mr-2" /> Connecter via Import</>
                    )}
                  </Button>
                ) : (
                  <Button 
                    variant={conn.status === 'connected' ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => conn.status === 'connected' ? handleDisconnect(conn.source) : handleConnect(conn.source)}
                    disabled={conn.status === 'syncing'}
                    className={conn.status !== 'connected' ? 'bg-[#0071E3] text-white hover:bg-[#0071E3]/90' : ''}
                  >
                    {conn.status === 'connected' ? (
                      <><Link2Off size={14} className="mr-2" /> Déconnecter</>
                    ) : (
                      <><Link2 size={14} className="mr-2" /> Connecter</>
                    )}
                  </Button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
