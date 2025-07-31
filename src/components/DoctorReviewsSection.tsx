import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Star, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useDoctorReviews } from "@/hooks/useDoctorReviews";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DoctorReviewsSectionProps {
  doctorUserId: string;
}

export function DoctorReviewsSection({ doctorUserId }: DoctorReviewsSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5;
  
  const { data, isLoading, error } = useDoctorReviews(doctorUserId, currentPage, reviewsPerPage);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`} 
      />
    ));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const abbreviateName = (name: string) => {
    const parts = name.split(' ');
    if (parts.length <= 1) return name;
    
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  };

  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardContent className="flex items-center justify-center p-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-soft">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Error al cargar las reseñas</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { reviews, rating_avg, rating_count } = data;
  const hasNextPage = reviews.length === reviewsPerPage;
  const hasPrevPage = currentPage > 1;

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          Reseñas de Pacientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Summary */}
        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{rating_avg.toFixed(1)}</div>
              <div className="flex justify-center">{renderStars(rating_avg)}</div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Basado en {rating_count} reseña{rating_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary">
                      {getInitials(review.patient_name)}
                    </span>
                  </div>

                  {/* Review Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">
                          {abbreviateName(review.patient_name)}
                        </h4>
                        {review.edited && (
                          <Badge variant="outline" className="text-xs">
                            Editada
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), "d MMM yyyy", { locale: es })}
                      </span>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">{renderStars(review.rating)}</div>
                      <span className="text-sm text-muted-foreground">
                        {review.rating}/5
                      </span>
                    </div>

                    {/* Comment */}
                    {review.comment && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border/30">
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {review.comment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">Sin reseñas aún</h3>
              <p className="text-sm text-muted-foreground">
                Este doctor aún no tiene reseñas de pacientes.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {(hasPrevPage || hasNextPage) && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={!hasPrevPage}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <span className="text-sm text-muted-foreground">
              Página {currentPage}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!hasNextPage}
              className="gap-2"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}