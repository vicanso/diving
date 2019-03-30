import axios from "axios";

axios.interceptors.response.use(
  function(response) {
    return response;
  },
  function(err) {
    if (err.response && err.response.data && err.response.data.message) {
      const { data } = err.response;
      let msg = data.message;
      if (data.category) {
        msg += `[${data.category}]`;
      }
      err.message = msg;
    }
    return Promise.reject(err);
  }
);

const ImageDetailURL = "/api/images/detail/";
const ImageLayerDetailURL = "/api/images/tree/";
const ImageCacheURL = "/api/images/caches";

const layerCache = {};

export function fetchImage(name) {
  return axios.get(ImageDetailURL + name);
}

export function fetchLayer(image, layer) {
  const key = `${image}-${layer}`;
  if (layerCache[key]) {
    return layerCache[key];
  }
  const p = axios.get(`${ImageLayerDetailURL}${image}?layer=${layer}`);
  layerCache[key] = p;
  p.catch(err => {
    delete layerCache[key];
    throw err;
  });
  return p;
}

export function fetchCaches() {
  return axios.get(ImageCacheURL);
}
