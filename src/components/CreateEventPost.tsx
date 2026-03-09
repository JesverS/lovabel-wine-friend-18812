import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Image as ImageIcon, X, Globe, LockKeyhole } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImageCropDialog } from '@/components/ImageCropDialog';

interface CreateEventPostProps {
  eventId: string;
  onPostCreated: () => void;
}

export const CreateEventPost = ({ eventId, onPostCreated }: CreateEventPostProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'members_only'>('members_only');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image trop lourde', description: 'Maximum 5 Mo', variant: 'destructive' });
      return;
    }
    const src = URL.createObjectURL(file);
    setRawImageSrc(src);
    setCropDialogOpen(true);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // Clean up raw preview
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc(null);
    setCropDialogOpen(false);

    const file = new File([croppedBlob], 'event-post-image.jpg', { type: 'image/jpeg' });
    setImageFile(file);
    setImagePreview(URL.createObjectURL(croppedBlob));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;
    setPosting(true);

    let imageUrl: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `${eventId}/posts/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('event')
        .upload(path, imageFile);

      if (uploadError) {
        toast({ title: 'Erreur d\'upload', description: uploadError.message, variant: 'destructive' });
        setPosting(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('event').getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const { error } = await supabase
      .from('event_post' as any)
      .insert({
        event_id: eventId,
        author_id: user.id,
        content: content.trim(),
        image_url: imageUrl,
        visibility,
      } as any);

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de publier le post', variant: 'destructive' });
    } else {
      toast({ title: 'Post publié !' });
      setContent('');
      removeImage();
      onPostCreated();
    }

    setPosting(false);
  };

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Partagez une actualité avec les participants..."
            className="min-h-[80px] resize-none"
            maxLength={2000}
          />

          {imagePreview && (
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg object-cover" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={removeImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <Button variant="ghost" size="sm" className="gap-2" asChild>
                  <span>
                    <ImageIcon className="h-4 w-4" />
                    Photo
                  </span>
                </Button>
              </label>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Visibilité :</Label>
                <Select value={visibility} onValueChange={(v) => setVisibility(v as 'public' | 'members_only')}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Tout le monde</span></SelectItem>
                    <SelectItem value="members_only"><span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Inscrits uniquement</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={posting || !content.trim()}
              size="sm"
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Publier
            </Button>
          </div>
        </CardContent>
      </Card>

      {rawImageSrc && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
              setRawImageSrc(null);
            }
            setCropDialogOpen(open);
          }}
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
          aspect={16 / 9}
          cropShape="rect"
          title="Ajuster l'image du post"
        />
      )}
    </>
  );
};
