import React from 'react';
import { Link } from 'react-router-dom';

// Regex pour détecter @slug et #hashtag
const MENTION_REGEX = /@([a-zA-Z0-9_-]+)/g;
const HASHTAG_REGEX = /#([a-zA-Z0-9_àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]+)/gi;

export interface ParsedContent {
  mentions: string[];
  hashtags: string[];
}

// Fonction pour extraire les mentions et hashtags
export function extractMentionsAndHashtags(content: string): ParsedContent {
  const mentions = [...content.matchAll(MENTION_REGEX)].map(m => m[1]);
  const hashtags = [...content.matchAll(HASHTAG_REGEX)].map(h => h[1].toLowerCase());
  return { 
    mentions: [...new Set(mentions)], 
    hashtags: [...new Set(hashtags)] 
  };
}

// Fonction pour rendre le contenu avec liens cliquables
export function renderContentWithLinks(content: string): React.ReactNode {
  if (!content) return null;

  // Combine les deux regex en une seule pour le split
  const combinedRegex = /(@[a-zA-Z0-9_-]+|#[a-zA-Z0-9_àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]+)/gi;
  
  const parts = content.split(combinedRegex);
  
  return parts.map((part, index) => {
    if (!part) return null;
    
    // Vérifier si c'est une mention
    if (part.startsWith('@')) {
      const slug = part.slice(1);
      return (
        <Link 
          key={index}
          to={`/user/${slug}`}
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }
    
    // Vérifier si c'est un hashtag
    if (part.startsWith('#')) {
      const tag = part.slice(1).toLowerCase();
      return (
        <Link 
          key={index}
          to={`/search?tag=${encodeURIComponent(tag)}`}
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }
    
    // Texte normal
    return <span key={index}>{part}</span>;
  });
}
