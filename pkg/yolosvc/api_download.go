package yolosvc

import (
	"fmt"
	"net/http"
	"path"

	"berty.tech/yolo/v2/pkg/bintray"
	"berty.tech/yolo/v2/pkg/yolopb"
	cayleypath "github.com/cayleygraph/cayley/query/path"
	"github.com/cayleygraph/quad"
	"github.com/go-chi/chi"
)

func (svc service) ArtifactDownloader(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "artifactID")

	p := cayleypath.
		StartPath(svc.db, quad.IRI(id)).
		Has(quad.IRI("rdf:type"), quad.IRI("yolo:Artifact"))
	var artifact yolopb.Artifact
	if err := svc.schema.LoadPathTo(r.Context(), svc.db, &artifact, p); err != nil {
		http.Error(w, fmt.Sprintf("err: %v", err), http.StatusInternalServerError)
		return
	}
	artifact.Cleanup()

	base := path.Base(artifact.LocalPath)
	w.Header().Add("Content-Disposition", fmt.Sprintf("inline; filename=%s", base))
	if artifact.FileSize > 0 {
		w.Header().Add("Content-Length", fmt.Sprintf("%d", artifact.FileSize))
	}
	if artifact.MimeType != "" {
		w.Header().Add("Content-Type", artifact.MimeType)
	}

	var err error
	switch artifact.Driver {
	case yolopb.Driver_Buildkite:
		if svc.bkc == nil {
			err = fmt.Errorf("buildkite token required")
		} else {
			_, err = svc.bkc.Artifacts.DownloadArtifactByURL(artifact.DownloadURL, w)
		}
	case yolopb.Driver_Bintray:
		err = bintray.DownloadContent(artifact.DownloadURL, w)
	// case Driver_CircleCI:
	default:
		err = fmt.Errorf("download not supported for this driver")
	}
	if err != nil {
		http.Error(w, fmt.Sprintf("err: %v", err), http.StatusInternalServerError)
	}
}
