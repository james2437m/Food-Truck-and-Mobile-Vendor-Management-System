;; Health Inspection and Food Safety Contract
;; Manages inspections, violations, and compliance tracking

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u300))
(define-constant ERR-INSPECTION-NOT-FOUND (err u301))
(define-constant ERR-INSPECTOR-NOT-FOUND (err u302))
(define-constant ERR-INVALID-INPUT (err u303))
(define-constant ERR-VIOLATION-NOT-FOUND (err u304))

;; Data Variables
(define-data-var next-inspector-id uint u1)
(define-data-var next-inspection-id uint u1)
(define-data-var next-violation-id uint u1)

;; Data Maps
(define-map inspectors
  { inspector-id: uint }
  {
    principal: principal,
    name: (string-ascii 100),
    certification: (string-ascii 100),
    active: bool,
    registered-date: uint
  }
)

(define-map inspections
  { inspection-id: uint }
  {
    vendor-id: uint,
    inspector-id: uint,
    inspection-date: uint,
    inspection-type: (string-ascii 50),
    score: uint,
    status: (string-ascii 20),
    notes: (string-ascii 500)
  }
)

(define-map violations
  { violation-id: uint }
  {
    inspection-id: uint,
    violation-type: (string-ascii 100),
    severity: (string-ascii 20),
    description: (string-ascii 300),
    corrected: bool,
    correction-date: (optional uint)
  }
)

(define-map vendor-compliance
  { vendor-id: uint }
  {
    last-inspection: uint,
    compliance-score: uint,
    total-inspections: uint,
    violations-count: uint,
    status: (string-ascii 20)
  }
)

;; Public Functions

;; Register inspector
(define-public (register-inspector (name (string-ascii 100))
                                  (certification (string-ascii 100)))
  (let ((inspector-id (var-get next-inspector-id)))
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> (len name) u0) ERR-INVALID-INPUT)
    (asserts! (> (len certification) u0) ERR-INVALID-INPUT)

    (map-set inspectors
      { inspector-id: inspector-id }
      {
        principal: tx-sender,
        name: name,
        certification: certification,
        active: true,
        registered-date: block-height
      }
    )

    (var-set next-inspector-id (+ inspector-id u1))
    (ok inspector-id)
  )
)

;; Conduct inspection
(define-public (conduct-inspection (vendor-id uint)
                                  (inspector-id uint)
                                  (inspection-type (string-ascii 50))
                                  (score uint)
                                  (notes (string-ascii 500)))
  (let ((inspection-id (var-get next-inspection-id))
        (inspector (unwrap! (map-get? inspectors { inspector-id: inspector-id }) ERR-INSPECTOR-NOT-FOUND)))

    (asserts! (get active inspector) ERR-NOT-AUTHORIZED)
    (asserts! (<= score u100) ERR-INVALID-INPUT)

    (map-set inspections
      { inspection-id: inspection-id }
      {
        vendor-id: vendor-id,
        inspector-id: inspector-id,
        inspection-date: block-height,
        inspection-type: inspection-type,
        score: score,
        status: "completed",
        notes: notes
      }
    )

    ;; Update vendor compliance
    (let ((current-compliance (default-to
                               { last-inspection: u0, compliance-score: u0, total-inspections: u0, violations-count: u0, status: "new" }
                               (map-get? vendor-compliance { vendor-id: vendor-id }))))
      (map-set vendor-compliance
        { vendor-id: vendor-id }
        {
          last-inspection: block-height,
          compliance-score: score,
          total-inspections: (+ (get total-inspections current-compliance) u1),
          violations-count: (get violations-count current-compliance),
          status: (if (>= score u80) "compliant" "non-compliant")
        }
      )
    )

    (var-set next-inspection-id (+ inspection-id u1))
    (ok inspection-id)
  )
)

;; Record violation
(define-public (record-violation (inspection-id uint)
                                (violation-type (string-ascii 100))
                                (severity (string-ascii 20))
                                (description (string-ascii 300)))
  (let ((violation-id (var-get next-violation-id))
        (inspection (unwrap! (map-get? inspections { inspection-id: inspection-id }) ERR-INSPECTION-NOT-FOUND)))

    (asserts! (or (is-eq severity "minor")
                  (is-eq severity "major")
                  (is-eq severity "critical")) ERR-INVALID-INPUT)

    (map-set violations
      { violation-id: violation-id }
      {
        inspection-id: inspection-id,
        violation-type: violation-type,
        severity: severity,
        description: description,
        corrected: false,
        correction-date: none
      }
    )

    ;; Update vendor violations count
    (let ((vendor-id (get vendor-id inspection))
          (current-compliance (unwrap! (map-get? vendor-compliance { vendor-id: (get vendor-id inspection) }) ERR-INSPECTION-NOT-FOUND)))
      (map-set vendor-compliance
        { vendor-id: vendor-id }
        (merge current-compliance {
          violations-count: (+ (get violations-count current-compliance) u1)
        })
      )
    )

    (var-set next-violation-id (+ violation-id u1))
    (ok violation-id)
  )
)

;; Mark violation as corrected
(define-public (mark-violation-corrected (violation-id uint))
  (let ((violation (unwrap! (map-get? violations { violation-id: violation-id }) ERR-VIOLATION-NOT-FOUND)))
    (asserts! (not (get corrected violation)) ERR-INVALID-INPUT)

    (map-set violations
      { violation-id: violation-id }
      (merge violation {
        corrected: true,
        correction-date: (some block-height)
      })
    )
    (ok true)
  )
)

;; Read-only functions

;; Get inspector details
(define-read-only (get-inspector (inspector-id uint))
  (map-get? inspectors { inspector-id: inspector-id })
)

;; Get inspection details
(define-read-only (get-inspection (inspection-id uint))
  (map-get? inspections { inspection-id: inspection-id })
)

;; Get violation details
(define-read-only (get-violation (violation-id uint))
  (map-get? violations { violation-id: violation-id })
)

;; Get vendor compliance status
(define-read-only (get-vendor-compliance (vendor-id uint))
  (map-get? vendor-compliance { vendor-id: vendor-id })
)

;; Check if vendor is compliant
(define-read-only (is-vendor-compliant (vendor-id uint))
  (match (map-get? vendor-compliance { vendor-id: vendor-id })
    compliance (is-eq (get status compliance) "compliant")
    false
  )
)
