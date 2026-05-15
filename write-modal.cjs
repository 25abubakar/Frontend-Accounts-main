const fs = require("fs");
const OUT = "C:/Users/ubaidullah/Desktop/Accounts/src/components/staff/RegisterAndHireModal.tsx";

const part9 = `
            {/* ── STEP 4: System Access ── */}
            {step === 4 && !done && (
              <motion.div key="step4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="space-y-4">
                <div className="mb-2">
                  <h3 className="text-base font-black text-slate-800">System Access</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Assign a branch and set login credentials</p>
                </div>

                {loadingTree ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-[#00A3FF]" />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Organization</p>

                    {/* Country */}
                    <div>
                      <FieldLabel required>Country</FieldLabel>
                      <SelectInput
                        value={selectedCountryNode?.id ?? ''}
                        onChange={e => {
                          const node = countryNodes.find(n => n.id === Number(e.target.value)) ?? null;
                          setSelectedCountryNode(node);
                          setSelectedCompanyNode(null);
                          setSelectedBranchNode(null);
                        }}
                      >
                        <option value="">Select country</option>
                        {countryNodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                      </SelectInput>
                    </div>

                    {/* Company */}
                    <div>
                      <FieldLabel required>Company</FieldLabel>
                      <SelectInput
                        value={selectedCompanyNode?.id ?? ''}
                        disabled={!selectedCountryNode || companyNodes.length === 0}
                        onChange={e => {
                          const node = companyNodes.find(n => n.id === Number(e.target.value)) ?? null;
                          setSelectedCompanyNode(node);
                          setSelectedBranchNode(null);
                        }}
                      >
                        <option value="">{!selectedCountryNode ? 'Select country first' : 'Select company'}</option>
                        {companyNodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                      </SelectInput>
                    </div>

                    {/* Branch */}
                    <div>
                      <FieldLabel required>Branch</FieldLabel>
                      <SelectInput
                        value={selectedBranchNode?.id ?? ''}
                        disabled={!selectedCompanyNode || branchNodes.length === 0}
                        onChange={e => {
                          const node = branchNodes.find(n => n.id === Number(e.target.value)) ?? null;
                          setSelectedBranchNode(node);
                        }}
                      >
                        <option value="">{!selectedCompanyNode ? 'Select company first' : 'Select branch'}</option>
                        {branchNodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                      </SelectInput>
                    </div>
                  </div>
                )}

                {/* Login ID preview */}
                {selectedBranchNode && (
                  <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 px-4 py-3">
                    <KeyRound size={16} className="text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Preview Login ID</p>
                      {loadingPreview ? (
                        <Loader2 size={14} className="animate-spin text-emerald-400 mt-0.5" />
                      ) : (
                        <p className="font-mono text-sm font-bold text-emerald-700">{previewLoginId || '—'}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Password */}
                <div>
                  <FieldLabel required>Password</FieldLabel>
                  <div className="relative">
                    <TextInput
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <FieldLabel required>Confirm Password</FieldLabel>
                  <div className="relative">
                    <TextInput
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1.5 text-xs font-semibold text-red-500">Passwords do not match</p>
                  )}
                </div>
              </motion.div>
            )}
`;

fs.appendFileSync(OUT, part9, "utf8");
console.log("Part 9 OK, bytes:", fs.statSync(OUT).size);
