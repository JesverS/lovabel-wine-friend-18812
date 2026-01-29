import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wine, ArrowLeft, Lock, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { WineTastingNotes } from '@/components/WineTastingNotes';
import { ReportContentDialog } from '@/components/ReportContentDialog';
import { Helmet } from 'react-helmet-async';

interface PostData {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  is_wine_notice: boolean;
  wine_notice: any;
  likes_count: number;
  comment_count: number;
  user_id: string;
  author: {
    full_name: string | null;
    logo_adress: string | null;
    slug: string | null;
    is_public: boolean;
  } | null;
  wine: {
    id: string;
    name: string;
    label_url: string | null;
    type: number | null;
    domain: { name: string } | null;
  } | null;
}

export default function PostDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) {
        setError('Identifiant de post invalide');
        setLoading(false);
        return;
      }

      // Récupérer le post par ID
      const { data: postData, error: postError } = await supabase
        .from('post')
        .select('id, content, image_url, created_at, is_wine_notice, wine_notice, likes_count, comment_count, user_id, wine_id')
        .eq('id', id)
        .maybeSingle();

      if (postError || !postData) {
        setError('Ce post n\'existe pas ou a été supprimé');
        setLoading(false);
        return;
      }

      // Récupérer l'auteur avec son statut public
      const { data: authorData } = await supabase
        .from('user_profiles_public' as any)
        .select('full_name, logo_adress, slug, is_public')
        .eq('id', postData.user_id)
        .maybeSingle();

      const authorInfo = authorData as any;
      const isAuthorPublic = authorInfo?.is_public ?? false;
      const isOwner = user?.id === postData.user_id;

      // Vérifier si le profil est privé et que l'utilisateur n'a pas accès
      if (!isAuthorPublic && !isOwner) {
        // Vérifier si l'utilisateur suit l'auteur (pour les profils privés)
        if (user) {
          const { data: followData } = await supabase
            .from('user_follow' as any)
            .select('status')
            .eq('follower_id', user.id)
            .eq('followed_id', postData.user_id)
            .maybeSingle();
          
          if (!followData || (followData as any).status !== 'accepted') {
            setIsPrivate(true);
            setLoading(false);
            return;
          }
        } else {
          setIsPrivate(true);
          setLoading(false);
          return;
        }
      }

      // Récupérer le vin si présent
      let wineData = null;
      if (postData.wine_id) {
        const { data } = await supabase
          .from('wine')
          .select('id, name, label_url, type, domain:domain_id(name)')
          .eq('id', postData.wine_id)
          .maybeSingle();
        wineData = data;
      }

      setPost({
        ...postData,
        author: authorInfo,
        wine: wineData as any,
      });
      setLoading(false);
    };

    fetchPost();
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pt-28">
          <Card className="max-w-2xl mx-auto p-6">
            <div className="flex items-start gap-3 mb-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-20 w-full mb-4" />
            <Skeleton className="h-48 w-full" />
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pt-28 flex items-center justify-center">
          <Card className="max-w-md p-8 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-xl font-semibold mb-2">Contenu privé</h1>
            <p className="text-muted-foreground mb-6">
              Ce post appartient à un compte privé. Suivez l'auteur pour accéder à son contenu.
            </p>
            <Button asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pt-28 flex items-center justify-center">
          <Card className="max-w-md p-8 text-center">
            <Wine className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-xl font-semibold mb-2">Post introuvable</h1>
            <p className="text-muted-foreground mb-6">{error || 'Ce post n\'existe pas ou a été supprimé.'}</p>
            <Button asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{post.author?.full_name || 'Utilisateur'} partage une dégustation | Wine Note</title>
        <meta name="description" content={post.content?.slice(0, 155) || `Découvrez la dégustation partagée par ${post.author?.full_name || 'un amateur de vin'} sur Wine Note.`} />
        <meta property="og:title" content={`${post.author?.full_name || 'Utilisateur'} sur Wine Note`} />
        <meta property="og:description" content={post.content?.slice(0, 155) || 'Dégustation partagée sur Wine Note'} />
        {post.image_url && <meta property="og:image" content={post.image_url} />}
        <meta property="og:type" content="article" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pt-28">
        <Card className="max-w-2xl mx-auto p-6 space-y-4">
          {/* Header avec auteur */}
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.author?.logo_adress || undefined} />
              <AvatarFallback>
                {post.author?.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {post.author?.slug ? (
                <Link to={`/user/${post.author.slug}`} className="font-semibold hover:underline">
                  {post.author?.full_name || 'Utilisateur'}
                </Link>
              ) : (
                <span className="font-semibold">{post.author?.full_name || 'Utilisateur'}</span>
              )}
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
              </p>
            </div>
            {user && user.id !== post.user_id && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setReportDialogOpen(true)}
                className="text-muted-foreground hover:text-destructive"
                title="Signaler ce post"
              >
                <Flag className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Contenu du post */}
          {post.content && (
            <p className="whitespace-pre-wrap">{post.content}</p>
          )}

          {/* Image du post */}
          {post.image_url && (
            <img
              src={post.image_url}
              alt="Post"
              className="w-full rounded-lg object-cover max-h-96"
            />
          )}

          {/* Vin associé */}
          {post.wine && (
            <Link
              to={`/wine/${post.wine.id}`}
              className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              {post.wine.label_url && (
                <img 
                  src={post.wine.label_url} 
                  alt={post.wine.name} 
                  className="w-12 h-16 object-cover rounded" 
                />
              )}
              <div>
                <p className="font-semibold">{post.wine.name}</p>
                <p className="text-sm text-muted-foreground">{post.wine.domain?.name}</p>
              </div>
            </Link>
          )}

          {/* Notes de dégustation */}
          {post.is_wine_notice && post.wine_notice && (
            <WineTastingNotes wineNotice={post.wine_notice} wineTypeId={post.wine?.type ?? null} />
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 pt-4 border-t text-sm text-muted-foreground">
            <span>{post.likes_count} J'aime</span>
            <span>{post.comment_count} Commentaires</span>
          </div>

          {/* CTA pour non-connectés */}
          {!user && (
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Rejoignez WineNote pour interagir avec ce post
              </p>
              <Button asChild>
                <Link to="/auth">Créer un compte</Link>
              </Button>
            </div>
          )}
        </Card>

        <ReportContentDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          postId={post.id}
        />
      </main>
      <Footer />
    </div>
  );
}
