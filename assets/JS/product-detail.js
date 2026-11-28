function changeImage(element, imgSrc) {
  let mainImage = document.getElementById("mainImage");
  mainImage.src = imgSrc;

  // Active class toggle
  let thumbnails = document.querySelectorAll(".thumbnail");
  thumbnails.forEach(thumb => thumb.classList.remove("active"));
  element.classList.add("active");
}

function scrollThumbnails(amount) {
  document.getElementById("thumbnailContainer").scrollBy({
    top: amount,
    behavior: "smooth"
  });
}

function openLightbox() {
  let mainImage = document.getElementById("mainImage");
  if (mainImage && window.openImagePreview) {
    window.openImagePreview(mainImage.src, 'Product Image Detail');
  }
}

function closeLightbox() {
  if (window.closePreview) {
    window.closePreview();
  }
}
