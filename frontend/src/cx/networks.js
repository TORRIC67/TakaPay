// The mobile-money networks shown on the "Mobile Money" card. Push payments work with any of them
// (the request goes to the customer's phone), so this list is only for display.
//
// Each entry is drawn as a small coloured badge. To use the OFFICIAL logo instead, put the image in
// frontend/public/networks/ and add `logo: "/networks/mpesa.png"` to the entry - it replaces the badge.
// (Official logos are trademarks, so only add them if you have the right to use them.)
export const NETWORKS = [
  { id: "mpesa", label: "M-Pesa", text: "M-PESA", bg: "#f82408", fg: "#FFFFFF", logo: null },
  { id: "Yas", label: "yas", text: "Mixx by Yass", bg: "#0A3D91", fg: "#FFFFFF", logo: null },
  { id: "Airtel Money", label: "Airtel Money", text: "Airtel", bg: "#f70b36", fg: "#FFFFFF", logo: null },
  { id: "haloPesa", label: "HaloPesa", text: "haloPesa", bg: "#F7941D", fg: "#FFFFFF", logo: null },
];
