/**
 * Art source configuration and rotation settings
 */
module.exports = {
  poolSize: 12,
  poolTtlSeconds: 3600,  // 1 hour
  retryDelayMs: 500,
  rotationIntervals: {
    portrait: 300,   // 5 minutes
    landscape: 420,  // 7 minutes
    tv: 360          // 6 minutes
  },
  sources: {
    artic: {
      enabled: true,
      weight: 35,
      styles: ['Cubism', 'Expressionism', 'Surrealism', 'Abstract', 'Minimalism', 'Constructivism', 'Symbolism', 'Suprematism', 'Bauhaus']
    },
    met: {
      enabled: true,
      weight: 35,
      hasImages: true,
      departments: [11, 21, 26, 30]  // European Paintings, The American Wing, Drawings/Prints, Photographs
    },
    cleveland: {
      enabled: true,
      weight: 20,
      type: 'Painting'
    },
    giphy: {
      enabled: false,
      weight: 0
    }
  },

  // Religious keywords to filter out
  religiousKeywords: [
    'christ', 'jesus', 'virgin', 'madonna', 'saint', 'holy', 'biblical', 'bible',
    'apostle', 'crucifixion', 'resurrection', 'nativity', 'annunciation', 'pieta',
    'crucified', 'crucifix', 'altar', 'cathedral', 'church', 'monastery', 'temple',
    'buddha', 'buddhist', 'hindu', 'shiva', 'vishnu', 'krishna', 'religious',
    'mosque', 'islamic', 'muhammad', 'prophet', 'divine', 'deity', 'god', 'angel',
    'archangel', 'gospel', 'scripture', 'sermon', 'prayer', 'blessing', 'baptism',
    'communion', 'eucharist', 'sacred', 'patron saint'
  ]
};
