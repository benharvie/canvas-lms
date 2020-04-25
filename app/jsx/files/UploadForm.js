/*
 * Copyright (C) 2015 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React from 'react'
import {bool, func, number, object, oneOfType, string} from 'prop-types'
import FileRenameForm from './FileRenameForm'
import ZipFileOptionsForm from './ZipFileOptionsForm'
import FileOptionsCollection from 'compiled/react_files/modules/FileOptionsCollection'

export const UploadFormPropTypes = {
  contextId: oneOfType([string, number]).isRequired,
  contextType: string.isRequired,
  currentFolder: object, // could be instanceOf(Folder), but if I import 'compiled/models/Folder', jest fails to run
  allowSkip: bool,
  visible: bool,
  inputId: string,
  inputName: string,
  autoUpload: bool, // if true, upload as soon as file(s) are selected
  disabled: bool,
  alwaysRename: bool, // if false offer to rename files
  alwaysUploadZips: bool, // if false offer to expand zip files
  onChange: func,
  onEmptyOrClose: func,
  onRenameFileMessage: func,
  onLockFileMessage: func
}

class UploadForm extends React.Component {
  static propTypes = UploadFormPropTypes

  static defaultProps = {
    allowSkip: false,
    autoUpload: true,
    disabled: false,
    alwaysRename: false,
    alwaysUploadZips: false,
    onChange: () => {},
    onEmptyOrClose: () => {},
    onRenameFileMessage: () => {},
    onLockFileMessage: () => {}
  }

  constructor(props) {
    super(props)

    this.formRef = React.createRef()
    this.addFileInputRef = React.createRef()
    this.resolvedUserAction = false
    this.state = {...FileOptionsCollection.getState()}
    this.setFolder(props.currentFolder)
    this.setUploadOptions(props)
  }

  setFolder(folder) {
    FileOptionsCollection.setFolder(folder)
  }

  getFolder() {
    return FileOptionsCollection.getFolder()
  }

  reset() {
    this.formRef.current?.reset()
  }

  setUploadOptions({alwaysRename, alwaysUploadZips}) {
    FileOptionsCollection.setUploadOptions({alwaysRename, alwaysUploadZips})
  }

  queueUploads() {
    this.reset()
    return FileOptionsCollection.queueUploads(this.props.contextId, this.props.contextType)
  }

  addFiles = () => {
    return this.addFileInputRef.current.click()
  }

  handleFilesInputChange = e => {
    this.props.onChange(e)
    this.resolvedUserAction = false
    FileOptionsCollection.setOptionsFromFiles(e.target.files)
    this.setStateFromOptions()
  }

  onNameConflictResolved = fileNameOptions => {
    FileOptionsCollection.onNameConflictResolved(fileNameOptions)
    this.resolvedUserAction = true
    this.setStateFromOptions(() => {
      if (
        this.state.resolvedNames.length +
          this.state.nameCollisions.length +
          this.state.zipOptions.length ===
        0
      ) {
        this.reset()
        this.props.onChange()
      }
    })
  }

  onZipOptionsResolved = fileNameOptions => {
    FileOptionsCollection.onZipOptionsResolved(fileNameOptions)
    this.resolvedUserAction = true
    this.setStateFromOptions()
  }

  onClose = () => {
    this.reset()
    if (!this.resolvedUserAction) {
      // user dismissed zip or name conflict modal without resolving things
      // reset state to dump previously selected files
      FileOptionsCollection.resetState()
      this.setStateFromOptions()
    }
    this.resolvedUserAction = false
    this.props.onEmptyOrClose()
  }

  componentDidUpdate() {
    this.setFolder(this.props.currentFolder)
    this.setUploadOptions(this.props)

    if (
      this.props.autoUpload &&
      this.state.zipOptions.length === 0 &&
      this.state.nameCollisions.length === 0 &&
      FileOptionsCollection.hasNewOptions()
    ) {
      if (this.state.resolvedNames.length > 0) {
        this.queueUploads(this.props.contextType, this.props.contextId)
      } else {
        this.props.onEmptyOrClose()
      }
    } else {
      this.resolvedUserAction = false
    }
  }

  UNSAFE_componentWillMount() {
    FileOptionsCollection.onChange = this.setStateFromOptions
  }

  componentWillUnMount() {
    FileOptionsCollection.onChange = null
  }

  setStateFromOptions = callback => {
    this.setState(FileOptionsCollection.getState(), callback)
  }

  buildPotentialModal = () => {
    if (this.state.zipOptions.length && !this.props.alwaysUploadZips) {
      return (
        <ZipFileOptionsForm
          fileOptions={this.state.zipOptions[0]}
          onZipOptionsResolved={this.onZipOptionsResolved}
          onClose={this.onClose}
        />
      )
    } else if (this.state.nameCollisions.length && !this.props.alwaysRename) {
      return (
        <FileRenameForm
          fileOptions={this.state.nameCollisions[0]}
          onNameConflictResolved={this.onNameConflictResolved}
          onClose={this.onClose}
          allowSkip={this.props.allowSkip}
          onRenameFileMessage={this.props.onRenameFileMessage}
          onLockFileMessage={this.props.onLockFileMessage}
        />
      )
    }
  }

  render() {
    return (
      <span>
        <form ref={this.formRef} className={this.props.visible ? '' : 'hidden'}>
          <input
            id={this.props.inputId}
            name={this.props.inputName}
            type="file"
            ref={this.addFileInputRef}
            onChange={this.handleFilesInputChange}
            multiple
            data-testid="file-input"
            disabled={this.props.disabled}
          />
        </form>
        {this.buildPotentialModal()}
      </span>
    )
  }
}

export default UploadForm
