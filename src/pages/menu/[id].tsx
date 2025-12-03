import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { useToast } from "~/components/ui/use-toast";
import { Menu, ArrowLeft, Download, Copy, Check, Share2 } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";

const QRCodeSVG = dynamic(() => import("qrcode.react").then((mod) => mod.QRCodeSVG), {
  ssr: false,
  loading: () => <div className="w-[120px] h-[120px] bg-gray-100 animate-pulse rounded" />,
});
import Link from "next/link";

export default function MenuView() {
  const { query } = useRouter();
  const { id } = query;
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [menuUrl, setMenuUrl] = useState("");
  const qrCodeRef = useRef<HTMLDivElement | null>(null);

  const menuQuery = api.restaurant.getPublicMenu.useQuery(
    { id: id as string },
    { 
      enabled: !!id,
      staleTime: 5 * 60 * 1000, // 5 minutes - menus don't change often
      gcTime: 10 * 60 * 1000, // 10 minutes
    }
  );
  
  // Handle nested response structures and ensure menu data is properly unwrapped
  const menuData = menuQuery.data;
  const menu = menuData && typeof menuData === 'object' && 'categories' in menuData
    ? menuData as typeof menuData
    : null;

  useEffect(() => {
    if (typeof window !== "undefined" && id) {
      setMenuUrl(`${window.location.origin}/menu/${id}`);
    }
  }, [id]);

  // Ensure categories is an array (moved before useEffects that use it)
  const categories = useMemo(() => {
    return menu?.categories && Array.isArray(menu.categories) 
      ? menu.categories 
      : [];
  }, [menu?.categories]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      const firstCategoryId = categories[0]?.id ?? null;
      setSelectedCategory(firstCategoryId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  // Update selected category based on scroll position (throttled for performance)
  useEffect(() => {
    if (!menu || categories.length === 0) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPosition = window.scrollY + 200; // Offset for header

          for (const category of categories) {
            const element = categoryRefs.current[category.id];
            if (element) {
              const { offsetTop, offsetHeight } = element;
              if (
                scrollPosition >= offsetTop &&
                scrollPosition < offsetTop + offsetHeight
              ) {
                setSelectedCategory(category.id);
                break;
              }
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menu, categories]);

  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategory);
  }, [categories, selectedCategory]);

  const scrollToCategory = useCallback((categoryId: string) => {
    const element = categoryRefs.current[categoryId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setSelectedCategory(categoryId);
      setShowMenuDialog(false);
    }
  }, []);

  const downloadQRCode = useCallback(() => {
    if (!qrCodeRef.current || !menuUrl || typeof window === "undefined") return;

    const svgElement = qrCodeRef.current.querySelector("svg");
    if (!svgElement) return;

    try {
      // Get SVG as string
      const serializer = typeof window !== "undefined" && window.XMLSerializer 
        ? new window.XMLSerializer() 
        : null;
      if (!serializer) return;
      const svgData = serializer.serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Create image from SVG
      const img = new window.Image();
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement("canvas");
        const size = 512; // High resolution for better quality
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Fill white background
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, size, size);

          // Draw SVG image
          ctx.drawImage(img, 0, 0, size, size);

          // Convert to PNG and download
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `menu-qr-code-${id || "menu"}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
          }, "image/png");
        }

        URL.revokeObjectURL(svgUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    } catch (error) {
      console.error("Error downloading QR code:", error);
    }
  }, [menuUrl, id]);

  const copyLink = useCallback(async () => {
    if (!menuUrl || typeof window === "undefined") return;

    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Menu link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  }, [menuUrl, toast]);

  const shareQRCode = useCallback(async () => {
    if (!qrCodeRef.current || !menuUrl || typeof window === "undefined") return;

    const svgElement = qrCodeRef.current.querySelector("svg");
    if (!svgElement) return;

    try {
      // Convert SVG to image blob
      const serializer = typeof window !== "undefined" && window.XMLSerializer 
        ? new window.XMLSerializer() 
        : null;
      if (!serializer) return;
      
      const svgData = serializer.serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Create image from SVG
      const img = new window.Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = svgUrl;
      });

      // Create canvas and convert to PNG
      const canvas = document.createElement("canvas");
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        throw new Error("Could not get canvas context");
      }

      // Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      // Draw SVG image
      ctx.drawImage(img, 0, 0, size, size);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob"));
          }
        }, "image/png");
      });

      URL.revokeObjectURL(svgUrl);

      // Check if Web Share API is available and supports files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], "menu-qr-code.png", { type: "image/png" })] })) {
        const file = new File([blob], `menu-qr-code-${id || "menu"}.png`, { type: "image/png" });
        await navigator.share({
          title: `Menu QR Code - ${menu?.name || "Restaurant Menu"}`,
          text: `Scan this QR code to view the menu: ${menuUrl}`,
          files: [file],
        });
        toast({
          title: "QR code shared!",
          description: "QR code has been shared successfully",
        });
      } else if (navigator.share) {
        // Fallback: Share text and URL if file sharing is not supported
        await navigator.share({
          title: `Menu QR Code - ${menu?.name || "Restaurant Menu"}`,
          text: `Scan this QR code to view the menu`,
          url: menuUrl,
        });
        toast({
          title: "Menu shared!",
          description: "Menu link has been shared successfully",
        });
      } else {
        // Fallback: Download the QR code if Web Share API is not available
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `menu-qr-code-${id || "menu"}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({
          title: "QR code downloaded!",
          description: "QR code has been downloaded. You can share it manually.",
        });
      }
    } catch (error) {
      console.error("Error sharing QR code:", error);
      // If user cancels share, don't show error
      if (error instanceof Error && error.name !== "AbortError") {
        toast({
          title: "Failed to share",
          description: "Could not share QR code. Please try downloading it instead.",
          variant: "destructive",
        });
      }
    }
  }, [menuUrl, id, menu, toast]);

  if (menuQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-7 w-40" />
              <div className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                      <Skeleton className="w-24 h-24 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 text-center">Menu not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pageTitle = menu ? `${menu.name} - Menu | Digital Menu Management` : "Menu | Digital Menu Management";
  const pageDescription = menu 
    ? `View the digital menu for ${menu.name} located in ${menu.location}. Browse our delicious dishes and categories.`
    : "View restaurant menu";

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content={menu ? `${menu.name} - Menu` : "Menu"} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        {menu && (
          <>
            <meta property="og:image" content={menu.categories?.[0]?.dishes?.[0]?.image || ""} />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Restaurant",
                  "name": menu.name,
                  "address": {
                    "@type": "PostalAddress",
                    "addressLocality": menu.location,
                  },
                  "servesCuisine": "Various",
                  "hasMenu": {
                    "@type": "Menu",
                    "hasMenuSection": categories.map((cat) => ({
                      "@type": "MenuSection",
                      "name": cat.name,
                      "hasMenuItem": cat.dishes.map((dish) => ({
                        "@type": "MenuItem",
                        "name": dish.name,
                        "description": dish.description || "",
                        "image": dish.image || "",
                        "offers": {
                          "@type": "Offer",
                          "price": dish.price?.toString() || "",
                          "priceCurrency": "INR",
                        },
                      })),
                    })),
                  },
                }),
              }}
            />
          </>
        )}
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Fixed Header */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b shadow-sm" role="banner">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="h-9 sm:h-10 -ml-2 sm:-ml-3" aria-label="Go back to dashboard">
                <ArrowLeft className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{menu.name}</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">{menu.location}</p>
            </div>
          </div>
          {currentCategory && (
            <div className="mt-2 sm:mt-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                {currentCategory.name}
              </h2>
            </div>
          )}
        </div>
      </header>

      {/* Menu Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6" role="main">
        {categories.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
              <p className="text-gray-500 text-center text-base sm:text-lg">
                No menu items available yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          categories.map((category) => (
          <div
            key={category.id}
            ref={(el) => {
              categoryRefs.current[category.id] = el;
            }}
            className="mb-6 sm:mb-8"
          >
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4" id={`category-${category.id}`}>{category.name}</h2>
            <div className="space-y-3 sm:space-y-4">
              {category.dishes.map((dish) => (
                <div
                  key={dish.id}
                  className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
                >
                    <div className="flex gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1 flex-wrap">
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${
                            dish.isVegetarian ? "bg-green-500" : "bg-red-500"
                          }`}
                          role="img"
                          aria-label={dish.isVegetarian ? "Vegetarian dish" : "Non-vegetarian dish"}
                          title={dish.isVegetarian ? "Vegetarian" : "Non-vegetarian"}
                        />
                        <h3 className="font-semibold text-base sm:text-lg text-gray-900 flex-1 min-w-0">
                          {dish.name}
                        </h3>
                        {dish.price !== null && dish.price !== undefined && (
                          <span className="ml-auto font-semibold text-gray-900 text-sm sm:text-base whitespace-nowrap">
                            ₹ {dish.price.toFixed(0)}
                          </span>
                        )}
                      </div>
                      {dish.description && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                          {dish.description}
                        </p>
                      )}
                      {dish.spiceLevel !== null &&
                        dish.spiceLevel !== undefined &&
                        dish.spiceLevel > 0 && (
                          <div className="flex items-center gap-1 mt-2" role="img" aria-label={`Spice level: ${dish.spiceLevel} out of 5`}>
                            {Array.from({ length: Math.min(dish.spiceLevel, 5) }).map(
                              (_, i) => (
                                <span key={i} className="text-xs sm:text-sm" aria-hidden="true">
                                  🌶️
                                </span>
                              )
                            )}
                          </div>
                        )}
                    </div>
                    {dish.image && (
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={dish.image}
                          alt={`${dish.name}${dish.description ? ` - ${dish.description}` : ""}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 80px, 96px"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )))}
      </main>

      {/* Floating Menu Button */}
      <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-12 sm:h-14 px-4 sm:px-6 rounded-full shadow-lg z-20 bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="font-medium text-sm sm:text-base hidden sm:inline">Menu</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Menu Categories</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Select a category to navigate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {categories.map((category) => (
              <div key={category.id}>
                <Button
                  variant={selectedCategory === category.id ? "default" : "ghost"}
                  className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base"
                  onClick={() => scrollToCategory(category.id)}
                >
                  {category.name}
                  <span className="ml-auto text-xs text-gray-500">
                    ({category.dishes.length})
                  </span>
                </Button>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 mt-4">
            <div className="text-center">
              <p className="text-sm sm:text-base font-semibold mb-2">Share Menu</p>
              {menuUrl && (
                <div className="flex flex-col items-center gap-3">
                  <div ref={qrCodeRef} className="flex justify-center">
                    <QRCodeSVG value={menuUrl} size={120} className="sm:w-[150px] sm:h-[150px]" />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      onClick={shareQRCode}
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-initial"
                      aria-label="Share QR code"
                    >
                      <Share2 className="h-4 w-4 mr-2" aria-hidden="true" />
                      Share QR Code
                    </Button>
                    <Button
                      onClick={downloadQRCode}
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-initial"
                      aria-label="Download QR code"
                    >
                      <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                      Download
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 w-full max-w-xs sm:max-w-sm">
                    <p className="text-xs text-gray-600 break-all px-2 flex-1 min-w-0">{menuUrl}</p>
                    <Button
                      onClick={copyLink}
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0"
                      aria-label="Copy link"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}

